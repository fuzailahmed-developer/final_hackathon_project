const express = require('express');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

/**
 * @route   GET /api/departments
 * @desc    Get all departments with active employee counts
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });

    // Calculate real employee counts per department without fake numbers
    const departmentCounts = await Employee.aggregate([
      { $match: { employmentStatus: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    departmentCounts.forEach((dc) => {
      if (dc._id) countMap[dc._id.toString()] = dc.count;
    });

    const data = departments.map((d) => ({
      ...d.toObject(),
      employeeCount: countMap[d._id.toString()] || 0
    }));

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[Get Departments Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve departments'
    });
  }
});

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    const trimmedName = name.trim();
    const existing = await Department.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Department '${trimmedName}' already exists`
      });
    }

    const department = await Department.create({
      name: trimmedName,
      description: description ? description.trim() : '',
      isActive: true
    });

    createAuditLog({
      actor: req.user,
      action: 'CREATE',
      entity: 'Department',
      entityId: department._id,
      before: null,
      after: { name: department.name, description: department.description }
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    console.error('[Create Department Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create department'
    });
  }
});

/**
 * @route   PUT /api/departments/:id
 * @desc    Update department details
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const before = { name: department.name, description: department.description, isActive: department.isActive };

    if (name && name.trim() !== department.name) {
      const trimmedName = name.trim();
      const existing = await Department.findOne({
        _id: { $ne: department._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Department '${trimmedName}' already exists`
        });
      }
      department.name = trimmedName;
    }

    if (description !== undefined) department.description = description.trim();
    if (isActive !== undefined) department.isActive = Boolean(isActive);

    await department.save();

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Department',
      entityId: department._id,
      before,
      after: { name: department.name, description: department.description, isActive: department.isActive }
    });

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    console.error('[Update Department Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update department'
    });
  }
});

/**
 * @route   PATCH /api/departments/:id/status
 * @desc    Toggle department active status
 * @access  Private (Admin only)
 */
router.patch('/:id/status', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    department.isActive = !department.isActive;
    await department.save();

    return res.status(200).json({
      success: true,
      message: `Department marked as ${department.isActive ? 'Active' : 'Inactive'}`,
      data: department
    });
  } catch (error) {
    console.error('[Toggle Department Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update department status'
    });
  }
});

module.exports = router;
