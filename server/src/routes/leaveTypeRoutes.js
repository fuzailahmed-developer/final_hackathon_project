const express = require('express');
const LeaveType = require('../models/LeaveType');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

// Default Leave Types required by the Hackathon challenge
const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave', annualQuota: 14, isUnpaid: false, description: 'Standard annual paid leave' },
  { name: 'Sick Leave', annualQuota: 8, isUnpaid: false, description: 'Medical and sick leave' },
  { name: 'Casual Leave', annualQuota: 10, isUnpaid: false, description: 'Short-term casual personal leave' },
  { name: 'Unpaid Leave', annualQuota: 0, isUnpaid: true, description: 'Unlimited unpaid leave of absence' }
];

/**
 * @route   GET /api/leave-types
 * @desc    Get all leave types (auto-seeds challenge defaults if empty)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    let leaveTypes = await LeaveType.find().sort({ createdAt: 1 });

    if (leaveTypes.length === 0) {
      await LeaveType.insertMany(DEFAULT_LEAVE_TYPES);
      leaveTypes = await LeaveType.find().sort({ createdAt: 1 });
    }

    return res.status(200).json({
      success: true,
      data: leaveTypes
    });
  } catch (error) {
    console.error('[Get Leave Types Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave types'
    });
  }
});

/**
 * @route   POST /api/leave-types
 * @desc    Create new leave type
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, annualQuota, isUnpaid, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Leave type name is required'
      });
    }

    const trimmedName = name.trim();
    const existing = await LeaveType.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Leave type '${trimmedName}' already exists`
      });
    }

    const leaveType = await LeaveType.create({
      name: trimmedName,
      annualQuota: isUnpaid ? 0 : Number(annualQuota) || 0,
      isUnpaid: Boolean(isUnpaid),
      description: description ? description.trim() : '',
      isActive: true
    });

    createAuditLog({
      actor: req.user,
      action: 'CREATE',
      entity: 'LeaveType',
      entityId: leaveType._id,
      before: null,
      after: { name: leaveType.name, annualQuota: leaveType.annualQuota, isUnpaid: leaveType.isUnpaid }
    });

    return res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: leaveType
    });
  } catch (error) {
    console.error('[Create Leave Type Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create leave type'
    });
  }
});

/**
 * @route   PUT /api/leave-types/:id
 * @desc    Update leave type configuration
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, annualQuota, isUnpaid, description, isActive } = req.body;
    const leaveType = await LeaveType.findById(req.params.id);

    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    const before = { name: leaveType.name, annualQuota: leaveType.annualQuota, isUnpaid: leaveType.isUnpaid, isActive: leaveType.isActive };

    if (name) {
      const trimmedName = name.trim();
      const existing = await LeaveType.findOne({
        _id: { $ne: leaveType._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Leave type '${trimmedName}' already exists`
        });
      }
      leaveType.name = trimmedName;
    }

    if (annualQuota !== undefined) leaveType.annualQuota = Number(annualQuota) || 0;
    if (isUnpaid !== undefined) leaveType.isUnpaid = Boolean(isUnpaid);
    if (description !== undefined) leaveType.description = description.trim();
    if (isActive !== undefined) leaveType.isActive = Boolean(isActive);

    await leaveType.save();

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'LeaveType',
      entityId: leaveType._id,
      before,
      after: { name: leaveType.name, annualQuota: leaveType.annualQuota, isUnpaid: leaveType.isUnpaid, isActive: leaveType.isActive }
    });

    return res.status(200).json({
      success: true,
      message: 'Leave type updated successfully',
      data: leaveType
    });
  } catch (error) {
    console.error('[Update Leave Type Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update leave type'
    });
  }
});

/**
 * @route   PATCH /api/leave-types/:id/status
 * @desc    Toggle leave type status
 * @access  Private (Admin only)
 */
router.patch('/:id/status', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);
    if (!leaveType) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    leaveType.isActive = !leaveType.isActive;
    await leaveType.save();

    return res.status(200).json({
      success: true,
      message: `Leave type marked as ${leaveType.isActive ? 'Active' : 'Inactive'}`,
      data: leaveType
    });
  } catch (error) {
    console.error('[Toggle Leave Type Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update leave type status'
    });
  }
});

module.exports = router;
