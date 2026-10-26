const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const Employee = require('../models/Employee');
const { calculateWorkingDays, getLeaveBalance } = require('../services/leaveService');
const { createAuditLog } = require('../services/auditService');
const { notifyByRole, notifyUser } = require('../services/notificationService');

const resolveEmployee = async (user) => {
  let employee = await Employee.findOne({ user: user._id });
  if (!employee && user.employeeId) {
    employee = await Employee.findOne({ employeeId: user.employeeId });
  }
  return employee;
};

// GET /api/leaves - List leaves (scoped for employee, all for admin/hr)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'employee') {
      const emp = await resolveEmployee(req.user);
      if (!emp) return res.status(404).json({ success: false, message: 'Employee profile not found' });
      filter.employee = emp._id;
    } else if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const leaves = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name isPaid isUnpaid annualQuota')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (err) {
    console.error('Error fetching leaves:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leaves/balance - Get leave balance for current employee or query param
router.get('/balance', authenticate, async (req, res) => {
  try {
    let empId;
    if (req.user.role === 'employee' || !req.query.employeeId) {
      const emp = await resolveEmployee(req.user);
      if (!emp) return res.status(404).json({ success: false, message: 'Employee profile not found' });
      empId = emp._id;
    } else {
      empId = req.query.employeeId;
    }

    const balances = await getLeaveBalance(empId);
    res.json({ success: true, data: balances });
  } catch (err) {
    console.error('Error fetching leave balances:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/leaves - Submit leave request
router.post('/', authenticate, async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required leave fields' });
    }

    const emp = await resolveEmployee(req.user);
    if (!emp) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const workingDays = await calculateWorkingDays(start, end);
    if (workingDays === 0) {
      return res.status(400).json({ success: false, message: 'Selected date range contains 0 working days' });
    }

    // Check for overlapping pending or approved leave requests
    const overlapping = await LeaveRequest.findOne({
      employee: emp._id,
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start }
    });
    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active (pending or approved) leave request during this date range'
      });
    }

    // Check leave balance
    const leaveTypeDoc = await LeaveType.findById(leaveTypeId);
    if (!leaveTypeDoc) {
      return res.status(400).json({ success: false, message: 'Invalid leave type' });
    }
    if (!leaveTypeDoc.isUnpaid) {
      const balances = await getLeaveBalance(emp._id);
      const bal = balances.find((b) => b.leaveType === leaveTypeDoc.name);
      if (bal && bal.remaining < workingDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. Remaining: ${bal.remaining} days, requested: ${workingDays} days.`
        });
      }
    }

    const leaveRequest = await LeaveRequest.create({
      employee: emp._id,
      leaveType: leaveTypeId,
      startDate: start,
      endDate: end,
      totalDays: workingDays,
      reason: reason || '',
      status: 'pending'
    });

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('leaveType', 'name')
      .populate('employee', 'firstName lastName employeeId');

    // Notify HR/Admin that a leave was submitted
    notifyByRole({
      roles: ['hr', 'admin'],
      type: 'leave_submitted',
      title: 'New Leave Request',
      message: `${populated.employee?.firstName || 'Employee'} ${populated.employee?.lastName || ''} submitted a ${populated.leaveType?.name || 'leave'} request (${workingDays} day${workingDays !== 1 ? 's' : ''}).`,
      relatedEntity: 'LeaveRequest',
      relatedEntityId: leaveRequest._id
    });

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('Error submitting leave:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/leaves/:id/status - Approve or reject leave request (admin, hr)
router.patch('/:id/status', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting a leave request' });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    if (rejectionReason) leave.rejectionReason = rejectionReason.trim();

    await leave.save();

    const updated = await LeaveRequest.findById(leave._id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('leaveType', 'name');

    // Notify the employee about the decision
    const emp = await Employee.findById(leave.employee).populate('user', '_id').lean();
    if (emp?.user?._id) {
      notifyUser({
        userId: emp.user._id,
        type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
        title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your ${updated.leaveType?.name || 'leave'} request has been ${status}${
          status === 'rejected' && rejectionReason ? `: ${rejectionReason}` : '.'
        }`,
        relatedEntity: 'LeaveRequest',
        relatedEntityId: leave._id
      });
    }

    // Audit log
    createAuditLog({
      actor: req.user,
      action: status === 'approved' ? 'APPROVE' : 'REJECT',
      entity: 'LeaveRequest',
      entityId: leave._id,
      before: { status: 'pending' },
      after: { status, rejectionReason: rejectionReason || null }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/leaves/:id - Cancel pending leave request
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending leave requests can be cancelled' });
    }
    if (req.user.role === 'employee') {
      const emp = await resolveEmployee(req.user);
      if (!emp || leave.employee.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this leave' });
      }
    }
    await leave.deleteOne();
    res.json({ success: true, message: 'Leave request cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling leave:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
