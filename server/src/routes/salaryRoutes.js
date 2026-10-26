const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');

// HR/Admin can set or update salary for an employee
router.post('/', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { employeeId, basicSalary, effectiveFrom, effectiveTo } = req.body;
    if (!employeeId || basicSalary == null || !effectiveFrom) {
      return res.status(400).json({ success: false, message: 'employeeId, basicSalary and effectiveFrom are required' });
    }
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Deactivate any overlapping active salary records
    await Salary.updateMany(
      {
        employee: employeeId,
        isActive: true,
        $or: [
          { effectiveFrom: { $lte: new Date(effectiveFrom) }, effectiveTo: null },
          { effectiveFrom: { $lte: new Date(effectiveFrom) }, effectiveTo: { $gte: new Date(effectiveFrom) } }
        ]
      },
      { isActive: false }
    );

    const salary = new Salary({
      employee: employeeId,
      basicSalary,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      isActive: true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });
    await salary.save();

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Salary',
      entityId: salary._id,
      before: null,
      after: { employee: employeeId, basicSalary, effectiveFrom }
    });

    res.json({ success: true, data: salary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current active salary for an employee (HR/Admin)
router.get('/current/:employeeId', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const salary = await Salary.findOne({ employee: req.params.employeeId, isActive: true }).sort({ effectiveFrom: -1 });
    if (!salary) return res.status(404).json({ success: false, message: 'Salary not configured' });
    res.json({ success: true, data: salary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get salary history for an employee (HR/Admin)
router.get('/history/:employeeId', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const salaries = await Salary.find({ employee: req.params.employeeId }).sort({ effectiveFrom: -1 });
    res.json({ success: true, data: salaries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
