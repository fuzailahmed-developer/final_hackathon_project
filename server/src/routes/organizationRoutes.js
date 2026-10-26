const express = require('express');
const Organization = require('../models/Organization');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

/**
 * @route   GET /api/organization
 * @desc    Get organization settings
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const org = await Organization.findOne().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: org,
      isConfigured: !!org
    });
  } catch (error) {
    console.error('[Get Organization Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve organization settings'
    });
  }
});

/**
 * @route   POST /api/organization
 * @desc    Initialize or update organization settings
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      officeStartTime,
      gracePeriodMinutes,
      halfDayHours,
      officeLatitude,
      officeLongitude,
      officeRadiusMeters,
      weekendDays
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }

    let org = await Organization.findOne().sort({ createdAt: -1 });

    const payload = {
      name: name.trim(),
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      officeStartTime: officeStartTime || '09:00',
      gracePeriodMinutes: gracePeriodMinutes !== undefined ? Number(gracePeriodMinutes) : 15,
      halfDayHours: halfDayHours !== undefined ? Number(halfDayHours) : 5,
      officeLatitude: officeLatitude ? Number(officeLatitude) : null,
      officeLongitude: officeLongitude ? Number(officeLongitude) : null,
      officeRadiusMeters: officeRadiusMeters ? Number(officeRadiusMeters) : 100,
      weekendDays: Array.isArray(weekendDays) && weekendDays.length > 0 ? weekendDays : ['Saturday', 'Sunday'],
      isConfigured: true
    };

    const before = org ? org.toObject() : null;

    if (org) {
      org = await Organization.findByIdAndUpdate(org._id, payload, { new: true, runValidators: true });
    } else {
      org = await Organization.create(payload);
    }

    createAuditLog({
      actor: req.user,
      action: before ? 'UPDATE' : 'CREATE',
      entity: 'Organization',
      entityId: org._id,
      before,
      after: org.toObject()
    });

    return res.status(200).json({
      success: true,
      message: 'Organization settings saved successfully',
      data: org
    });
  } catch (error) {
    console.error('[Save Organization Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save organization settings'
    });
  }
});

/**
 * @route   PUT /api/organization
 * @desc    Update organization settings
 * @access  Private (Admin only)
 */
router.put('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    let org = await Organization.findOne().sort({ createdAt: -1 });
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found. Please complete initial setup first.'
      });
    }

    const before = org.toObject();
    org = await Organization.findByIdAndUpdate(org._id, req.body, { new: true, runValidators: true });

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Organization',
      entityId: org._id,
      before,
      after: org.toObject()
    });

    return res.status(200).json({
      success: true,
      message: 'Organization settings updated successfully',
      data: org
    });
  } catch (error) {
    console.error('[Update Organization Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update organization settings'
    });
  }
});

module.exports = router;
