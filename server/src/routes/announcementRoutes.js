const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { createAuditLog } = require('../services/auditService');
const { notifyUsers, notifyByRole } = require('../services/notificationService');

/**
 * Determine which user IDs should receive a notification for this announcement audience.
 */
async function resolveAudienceUserIds(announcement) {
  try {
    if (announcement.audience === 'all') {
      const users = await User.find({ isActive: true }).select('_id').lean();
      return users.map((u) => u._id);
    }
    if (announcement.audience === 'hr') {
      const users = await User.find({ role: 'hr', isActive: true }).select('_id').lean();
      return users.map((u) => u._id);
    }
    if (announcement.audience === 'employees') {
      const users = await User.find({ role: 'employee', isActive: true }).select('_id').lean();
      return users.map((u) => u._id);
    }
    if (announcement.audience === 'department' && announcement.department) {
      const emps = await Employee.find({ department: announcement.department, isActive: true })
        .select('user')
        .lean();
      return emps.map((e) => e.user).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error('[Announcement] Error resolving audience:', err.message);
    return [];
  }
}

// GET /api/announcements — scoped by role
router.get('/', authenticate, async (req, res) => {
  try {
    const { role } = req.user;
    let filter = { isActive: true };

    if (role === 'admin') {
      // Admin sees all (including inactive when they pass ?all=true)
      if (req.query.all === 'true') {
        filter = {};
      }
    } else if (role === 'hr') {
      filter = {
        isActive: true,
        audience: { $in: ['all', 'hr'] }
      };
    } else {
      // employee — resolve department
      const emp = await Employee.findOne({ user: req.user._id }).lean();
      const audienceFilter = ['all', 'employees'];
      if (emp?.department) {
        audienceFilter.push('department');
        filter = {
          isActive: true,
          $or: [
            { audience: { $in: ['all', 'employees'] } },
            { audience: 'department', department: emp.department }
          ]
        };
      } else {
        filter = { isActive: true, audience: { $in: audienceFilter } };
      }
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email role')
      .populate('department', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: announcements });
  } catch (err) {
    console.error('[GET /announcements]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/announcements — admin, hr
router.post('/', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { title, message, audience, department, isActive } = req.body;
    if (!title || !message || !audience) {
      return res.status(400).json({ success: false, message: 'title, message, and audience are required' });
    }
    if (audience === 'department' && !department) {
      return res.status(400).json({ success: false, message: 'Department is required when audience is "department"' });
    }

    const announcement = await Announcement.create({
      title,
      message,
      audience,
      department: audience === 'department' ? department : null,
      createdBy: req.user._id,
      isActive: isActive !== undefined ? isActive : true
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email role')
      .populate('department', 'name');

    // Notify audience (fire-and-forget)
    resolveAudienceUserIds(announcement).then((userIds) => {
      if (userIds.length > 0) {
        notifyUsers({
          userIds,
          type: 'announcement_published',
          title: `New Announcement: ${title}`,
          message: message.length > 120 ? message.slice(0, 117) + '...' : message,
          relatedEntity: 'Announcement',
          relatedEntityId: announcement._id
        });
      }
    });

    // Audit log
    createAuditLog({
      actor: req.user,
      action: 'CREATE',
      entity: 'Announcement',
      entityId: announcement._id,
      before: null,
      after: { title, message, audience, department }
    });

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('[POST /announcements]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/announcements/:id — admin, hr
router.put('/:id', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const before = { title: existing.title, message: existing.message, audience: existing.audience, isActive: existing.isActive };

    const { title, message, audience, department, isActive } = req.body;
    if (title !== undefined) existing.title = title;
    if (message !== undefined) existing.message = message;
    if (audience !== undefined) existing.audience = audience;
    if (audience === 'department') {
      existing.department = department || null;
    } else {
      existing.department = null;
    }
    if (isActive !== undefined) existing.isActive = isActive;

    await existing.save();

    const updated = await Announcement.findById(existing._id)
      .populate('createdBy', 'name email role')
      .populate('department', 'name');

    // Audit log
    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Announcement',
      entityId: existing._id,
      before,
      after: { title: existing.title, message: existing.message, audience: existing.audience, isActive: existing.isActive }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PUT /announcements/:id]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/announcements/:id — admin only
router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const before = { title: existing.title, audience: existing.audience };
    await existing.deleteOne();

    createAuditLog({
      actor: req.user,
      action: 'DELETE',
      entity: 'Announcement',
      entityId: req.params.id,
      before,
      after: null
    });

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error('[DELETE /announcements/:id]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
