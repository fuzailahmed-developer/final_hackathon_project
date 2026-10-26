const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// GET /api/audit — ADMIN ONLY
router.get('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      action,
      entity,
      actor,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};
    if (action) filter.action = action.toUpperCase();
    if (entity) filter.entity = new RegExp(entity, 'i');
    if (actor) filter.actorName = new RegExp(actor, 'i');
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    console.error('[GET /audit]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/audit/distinct — get distinct actions and entities for filter dropdowns (Admin only)
router.get('/distinct', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const [actions, entities] = await Promise.all([
      AuditLog.distinct('action'),
      AuditLog.distinct('entity')
    ]);
    res.json({ success: true, data: { actions, entities } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// NO PUT/PATCH/DELETE — audit log is append-only by design

module.exports = router;
