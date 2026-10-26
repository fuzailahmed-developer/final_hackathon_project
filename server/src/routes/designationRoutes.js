const express = require('express');
const Designation = require('../models/Designation');
const Department = require('../models/Department');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

/**
 * @route   GET /api/designations
 * @desc    Get all designations (optionally filtered by department)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) {
      filter.department = req.query.department;
    }
    if (req.query.activeOnly === 'true') {
      filter.isActive = true;
    }

    const designations = await Designation.find(filter)
      .populate('department', 'name isActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: designations
    });
  } catch (error) {
    console.error('[Get Designations Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve designations'
    });
  }
});

/**
 * @route   POST /api/designations
 * @desc    Create new designation
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, department, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Designation title is required'
      });
    }

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for designation'
      });
    }

    const deptExists = await Department.findById(department);
    if (!deptExists) {
      return res.status(404).json({
        success: false,
        message: 'Selected department does not exist'
      });
    }

    const trimmedName = name.trim();
    const existing = await Designation.findOne({
      department,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Designation '${trimmedName}' already exists in ${deptExists.name}`
      });
    }

    const designation = await Designation.create({
      name: trimmedName,
      department,
      description: description ? description.trim() : '',
      isActive: true
    });

    await designation.populate('department', 'name');

    createAuditLog({
      actor: req.user,
      action: 'CREATE',
      entity: 'Designation',
      entityId: designation._id,
      before: null,
      after: { name: designation.name, department: designation.department?.name || department }
    });

    return res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: designation
    });
  } catch (error) {
    console.error('[Create Designation Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create designation'
    });
  }
});

/**
 * @route   PUT /api/designations/:id
 * @desc    Update designation details
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, department, description, isActive } = req.body;
    const designation = await Designation.findById(req.params.id);

    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    const before = { name: designation.name, department: designation.department, description: designation.description, isActive: designation.isActive };
    const targetDeptId = department || designation.department;

    if (department && department !== designation.department.toString()) {
      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(404).json({
          success: false,
          message: 'Selected department does not exist'
        });
      }
      designation.department = department;
    }

    if (name) {
      const trimmedName = name.trim();
      const existing = await Designation.findOne({
        _id: { $ne: designation._id },
        department: targetDeptId,
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Designation '${trimmedName}' already exists in selected department`
        });
      }
      designation.name = trimmedName;
    }

    if (description !== undefined) designation.description = description.trim();
    if (isActive !== undefined) designation.isActive = Boolean(isActive);

    await designation.save();
    await designation.populate('department', 'name');

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Designation',
      entityId: designation._id,
      before,
      after: { name: designation.name, department: designation.department?.name || designation.department, isActive: designation.isActive }
    });

    return res.status(200).json({
      success: true,
      message: 'Designation updated successfully',
      data: designation
    });
  } catch (error) {
    console.error('[Update Designation Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update designation'
    });
  }
});

/**
 * @route   PATCH /api/designations/:id/status
 * @desc    Toggle designation status
 * @access  Private (Admin only)
 */
router.patch('/:id/status', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const designation = await Designation.findById(req.params.id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }

    designation.isActive = !designation.isActive;
    await designation.save();

    return res.status(200).json({
      success: true,
      message: `Designation marked as ${designation.isActive ? 'Active' : 'Inactive'}`,
      data: designation
    });
  } catch (error) {
    console.error('[Toggle Designation Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update designation status'
    });
  }
});

module.exports = router;
