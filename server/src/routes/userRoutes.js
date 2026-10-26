const express = require('express');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

/**
 * @route   GET /api/users/hr
 * @desc    Get all HR manager users
 * @access  Private (Admin only)
 */
router.get('/hr', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const hrUsers = await User.find({ role: 'hr' }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: hrUsers
    });
  } catch (error) {
    console.error('[Get HR Users Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve HR accounts'
    });
  }
});

/**
 * @route   POST /api/users/hr
 * @desc    Create a new HR manager account
 * @access  Private (Admin only)
 */
router.post('/hr', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An account with email '${cleanEmail}' already exists`
      });
    }

    const hrUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'hr',
      employeeId: `HR-${Math.floor(100 + Math.random() * 900)}`,
      isActive: true
    });

    createAuditLog({
      actor: req.user,
      action: 'CREATE',
      entity: 'User',
      entityId: hrUser._id,
      before: null,
      after: { name: hrUser.name, email: hrUser.email, role: 'hr' }
    });

    return res.status(201).json({
      success: true,
      message: 'HR Manager account created successfully',
      data: hrUser.toJSON()
    });
  } catch (error) {
    console.error('[Create HR User Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create HR account'
    });
  }
});

/**
 * @route   PATCH /api/users/hr/:id/status
 * @desc    Toggle HR user active status
 * @access  Private (Admin only)
 */
router.patch('/hr/:id/status', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const hrUser = await User.findOne({ _id: req.params.id, role: 'hr' });
    if (!hrUser) {
      return res.status(404).json({
        success: false,
        message: 'HR user not found'
      });
    }

    const beforeStatus = hrUser.isActive;
    hrUser.isActive = !hrUser.isActive;
    await hrUser.save();

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'User',
      entityId: hrUser._id,
      before: { isActive: beforeStatus },
      after: { isActive: hrUser.isActive }
    });

    return res.status(200).json({
      success: true,
      message: `HR account marked as ${hrUser.isActive ? 'Active' : 'Inactive'}`,
      data: hrUser.toJSON()
    });
  } catch (error) {
    console.error('[Toggle HR User Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update HR status'
    });
  }
});

module.exports = router;
