const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const payrollService = require('../services/payrollService');
const { createAuditLog } = require('../services/auditService');
const { notifyUsers } = require('../services/notificationService');

// HR/Admin can list payrolls
router.get('/', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const filter = {};
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;
    const payrolls = await require('../models/Payroll').find(filter).sort({ year: -1, month: -1 });
    res.json({ success: true, data: payrolls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get payroll details with totals
router.get('/:id', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const payroll = await require('../models/Payroll').findById(req.params.id);
    if (!payroll) return res.status(404).json({ success: false, message: 'Payroll not found' });
    res.json({ success: true, data: payroll });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all payroll items for a payroll run
router.get('/:id/items', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const items = await require('../models/PayrollItem').find({ payroll: req.params.id }).populate('employee');
    res.json({ success: true, data: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get a single employee's payroll item (employee can view own)
router.get('/:payrollId/items/:empId', authenticate, async (req, res) => {
  try {
    const { payrollId, empId } = req.params;
    // if employee role, ensure they only access own record
    if (req.user.role === 'employee' && req.user.employeeId !== empId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const item = await require('../models/PayrollItem').findOne({ payroll: payrollId, employee: empId }).populate('employee');
    if (!item) return res.status(404).json({ success: false, message: 'Payroll item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generate / recalculate payroll draft (HR/Admin)
router.post('/generate', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year required' });
    const payroll = await payrollService.calculateMonthlyPayroll(month, year, req.user._id);

    createAuditLog({
      actor: req.user,
      action: 'GENERATE',
      entity: 'Payroll',
      entityId: payroll._id || null,
      before: null,
      after: { month, year, status: payroll.status }
    });

    res.json({ success: true, data: payroll });
  } catch (err) {
    console.error(err);
    const status = err.message.includes('Finalized') ? 409 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// Finalize payroll (Admin only)
router.patch('/:id/finalize', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const payroll = await payrollService.finalizePayroll(req.params.id, req.user._id);

    // Audit log finalization
    createAuditLog({
      actor: req.user,
      action: 'FINALIZE',
      entity: 'Payroll',
      entityId: payroll._id || req.params.id,
      before: { status: 'draft' },
      after: { status: 'finalized', month: payroll.month, year: payroll.year }
    });

    // Notify affected employees
    try {
      const PayrollItem = require('../models/PayrollItem');
      const Employee = require('../models/Employee');
      const items = await PayrollItem.find({ payroll: payroll._id || req.params.id })
        .populate({ path: 'employee', populate: { path: 'user', select: '_id' } })
        .lean();
      const userIds = items
        .map((item) => item.employee?.user?._id)
        .filter(Boolean);
      if (userIds.length > 0) {
        notifyUsers({
          userIds,
          type: 'payroll_finalized',
          title: 'Payslip Available',
          message: `Your payslip for ${payroll.month}/${payroll.year} has been finalized and is now available.`,
          relatedEntity: 'Payroll',
          relatedEntityId: payroll._id || req.params.id
        });
      }
    } catch (notifyErr) {
      console.error('[payroll finalize] notification error:', notifyErr.message);
    }

    res.json({ success: true, data: payroll });
  } catch (err) {
    console.error(err);
    const status = err.message.includes('already finalized') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

module.exports = router;
