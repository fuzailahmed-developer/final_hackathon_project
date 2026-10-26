const express = require('express');
const Holiday = require('../models/Holiday');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

/**
 * @route   GET /api/holidays
 * @desc    Get all company holidays
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    return res.status(200).json({
      success: true,
      data: holidays
    });
  } catch (error) {
    console.error('[Get Holidays Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve holidays'
    });
  }
});

/**
 * @route   POST /api/holidays
 * @desc    Add a company holiday
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, date, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Holiday name is required'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Holiday date is required'
      });
    }

    const holiday = await Holiday.create({
      name: name.trim(),
      date: new Date(date),
      description: description ? description.trim() : ''
    });

    createAuditLog({
      actor: req.user,
      action: 'CREATE',
      entity: 'Holiday',
      entityId: holiday._id,
      before: null,
      after: { name: holiday.name, date: holiday.date }
    });

    return res.status(201).json({
      success: true,
      message: 'Holiday added successfully',
      data: holiday
    });
  } catch (error) {
    console.error('[Create Holiday Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add holiday'
    });
  }
});

/**
 * @route   PUT /api/holidays/:id
 * @desc    Update a company holiday
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, date, description } = req.body;
    const holiday = await Holiday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    const before = { name: holiday.name, date: holiday.date, description: holiday.description };

    if (name) holiday.name = name.trim();
    if (date) holiday.date = new Date(date);
    if (description !== undefined) holiday.description = description.trim();

    await holiday.save();

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Holiday',
      entityId: holiday._id,
      before,
      after: { name: holiday.name, date: holiday.date, description: holiday.description }
    });

    return res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (error) {
    console.error('[Update Holiday Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update holiday'
    });
  }
});

/**
 * @route   DELETE /api/holidays/:id
 * @desc    Delete a company holiday
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    createAuditLog({
      actor: req.user,
      action: 'DELETE',
      entity: 'Holiday',
      entityId: req.params.id,
      before: { name: holiday.name, date: holiday.date },
      after: null
    });

    return res.status(200).json({
      success: true,
      message: 'Holiday removed successfully'
    });
  } catch (error) {
    console.error('[Delete Holiday Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete holiday'
    });
  }
});

module.exports = router;
