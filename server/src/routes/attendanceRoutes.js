const express = require('express');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');
const {
  getFormattedDate,
  getOrgPolicies,
  calculateLateness,
  calculateCheckout
} = require('../services/attendanceService');

const router = express.Router();

/**
 * Helper: Resolve Employee record for currently authenticated user
 */
const resolveCurrentEmployee = async (user) => {
  let employee = await Employee.findOne({ user: user._id });
  if (!employee && user.employeeId) {
    employee = await Employee.findOne({ employeeId: user.employeeId });
  }
  return employee;
};

/**
 * @route   POST /api/attendance/check-in
 * @desc    Record daily employee check-in with server-side timestamp
 * @access  Private (Employee, HR, Admin)
 */
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const employee = await resolveCurrentEmployee(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'No employee profile linked to current user account'
      });
    }

    const serverNow = new Date();
    const todayDateStr = getFormattedDate(serverNow);

    // Check if record already exists for today
    const existing = await Attendance.findOne({
      employee: employee._id,
      date: todayDateStr
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already recorded for today.'
      });
    }

    // Read organization settings (Chunk 2 source of truth)
    const policies = await getOrgPolicies();
    const lateness = calculateLateness(
      serverNow,
      policies.officeStartTime,
      policies.gracePeriodMinutes
    );

    try {
      const attendance = await Attendance.create({
        employee: employee._id,
        date: todayDateStr,
        checkIn: serverNow,
        status: lateness.status,
        lateMinutes: lateness.lateMinutes
      });

      const timeFormatted = serverNow.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return res.status(201).json({
        success: true,
        message: `Checked in successfully at ${timeFormatted}.${lateness.isLate ? ` (Late by ${lateness.lateMinutes} mins)` : ''}`,
        data: attendance
      });
    } catch (createErr) {
      // Catch MongoDB unique compound index collision (E11000)
      if (createErr.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Attendance already recorded for today.'
        });
      }
      throw createErr;
    }
  } catch (error) {
    console.error('[Check-in Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error recording check-in'
    });
  }
});

/**
 * @route   POST /api/attendance/check-out
 * @desc    Record daily employee check-out with server-side duration calculation
 * @access  Private (Employee, HR, Admin)
 */
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const employee = await resolveCurrentEmployee(req.user);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'No employee profile linked to current user account'
      });
    }

    const serverNow = new Date();
    const todayDateStr = getFormattedDate(serverNow);

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: todayDateStr
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'You need to check in before checking out.'
      });
    }

    if (attendance.checkOut) {
      return res.status(409).json({
        success: false,
        message: "Today's attendance has already been completed."
      });
    }

    const policies = await getOrgPolicies();
    const checkoutResult = calculateCheckout(
      attendance.checkIn,
      serverNow,
      attendance.status,
      policies.halfDayHours
    );

    attendance.checkOut = serverNow;
    attendance.workedMinutes = checkoutResult.workedMinutes;
    attendance.status = checkoutResult.status;

    await attendance.save();

    const timeFormatted = serverNow.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const hours = Math.floor(attendance.workedMinutes / 60);
    const mins = attendance.workedMinutes % 60;

    return res.status(200).json({
      success: true,
      message: `Checked out successfully at ${timeFormatted}. Total worked: ${hours}h ${mins}m (${attendance.status === 'half_day' ? 'Half Day' : 'Full Day'}).`,
      data: attendance
    });
  } catch (error) {
    console.error('[Check-out Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error recording check-out'
    });
  }
});

/**
 * @route   GET /api/attendance/me/today
 * @desc    Get currently logged-in employee's attendance record for today
 * @access  Private (Employee, HR, Admin)
 */
router.get('/me/today', authenticate, async (req, res) => {
  try {
    const employee = await resolveCurrentEmployee(req.user);
    if (!employee) {
      return res.status(200).json({ success: true, data: null });
    }

    const todayDateStr = getFormattedDate(new Date());
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: todayDateStr
    });

    return res.status(200).json({
      success: true,
      data: attendance || null
    });
  } catch (error) {
    console.error('[Get Today Attendance Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve today attendance record'
    });
  }
});

/**
 * @route   GET /api/attendance/me
 * @desc    Get personal attendance history with date filtering
 * @access  Private (Employee, HR, Admin)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const employee = await resolveCurrentEmployee(req.user);
    if (!employee) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const { startDate, endDate } = req.query;
    const filter = { employee: employee._id };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }

    const records = await Attendance.find(filter).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('[Get Personal Attendance History Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance history'
    });
  }
});

/**
 * @route   GET /api/attendance/me/summary
 * @desc    Get personal weekly hours and summary metrics
 * @access  Private (Employee, HR, Admin)
 */
router.get('/me/summary', authenticate, async (req, res) => {
  try {
    const employee = await resolveCurrentEmployee(req.user);
    if (!employee) {
      return res.status(200).json({
        success: true,
        data: {
          weekWorkedMinutes: 0,
          weekWorkedHoursFormatted: '0h 00m',
          targetHours: 40,
          presentDays: 0,
          lateDays: 0,
          halfDays: 0
        }
      });
    }

    // Determine current calendar week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    const mondayStr = getFormattedDate(monday);
    const todayStr = getFormattedDate(now);

    const weekRecords = await Attendance.find({
      employee: employee._id,
      date: { $gte: mondayStr, $lte: todayStr }
    });

    let totalWorkedMinutes = 0;
    let presentDays = 0;
    let lateDays = 0;
    let halfDays = 0;

    weekRecords.forEach((rec) => {
      totalWorkedMinutes += rec.workedMinutes || 0;
      if (rec.status === 'present' || rec.status === 'corrected') presentDays++;
      if (rec.status === 'late') lateDays++;
      if (rec.status === 'half_day') halfDays++;
    });

    const hours = Math.floor(totalWorkedMinutes / 60);
    const mins = totalWorkedMinutes % 60;
    const formattedHours = `${hours}h ${String(mins).padStart(2, '0')}m`;

    return res.status(200).json({
      success: true,
      data: {
        weekWorkedMinutes: totalWorkedMinutes,
        weekWorkedHoursFormatted: formattedHours,
        targetHours: 40,
        presentDays,
        lateDays,
        halfDays,
        weekRecordCount: weekRecords.length
      }
    });
  } catch (error) {
    console.error('[Get Personal Summary Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance summary'
    });
  }
});

/**
 * @route   GET /api/attendance
 * @desc    Get workforce attendance records for HR & Admin with server-side filters
 * @access  Private (Admin, HR only)
 */
router.get('/', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { date, startDate, endDate, department, status, employee, search } = req.query;
    const filter = {};

    // Date filtering: single date or range
    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }

    if (status) {
      filter.status = status;
    }

    if (employee) {
      filter.employee = employee;
    }

    // Retrieve attendance with populated employee, department, and designation
    let records = await Attendance.find(filter)
      .populate({
        path: 'employee',
        select: 'firstName lastName email employeeId department designation employmentStatus',
        populate: [
          { path: 'department', select: 'name' },
          { path: 'designation', select: 'name' }
        ]
      })
      .populate('correctedBy', 'name email role')
      .sort({ date: -1, createdAt: -1 });

    // Filter in-memory for department or search if specified
    if (department) {
      records = records.filter(
        (r) => r.employee?.department?._id?.toString() === department || r.employee?.department?.toString() === department
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter((r) => {
        const emp = r.employee;
        if (!emp) return false;
        const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const empId = (emp.employeeId || '').toLowerCase();
        const email = (emp.email || '').toLowerCase();
        return name.includes(q) || empId.includes(q) || email.includes(q);
      });
    }

    // Dynamic missing checkout detection for past days
    const todayStr = getFormattedDate(new Date());
    const processedRecords = records.map((rec) => {
      const recObj = rec.toObject();
      if (!recObj.checkOut && recObj.date < todayStr && recObj.status !== 'corrected') {
        recObj.displayStatus = 'missing_checkout';
      } else {
        recObj.displayStatus = recObj.status;
      }
      return recObj;
    });

    // Summary counts for the filtered view
    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let missingCheckoutCount = 0;

    processedRecords.forEach((r) => {
      const st = r.displayStatus;
      if (st === 'present' || st === 'corrected') presentCount++;
      if (st === 'late') lateCount++;
      if (st === 'half_day') halfDayCount++;
      if (st === 'missing_checkout' || (!r.checkOut && r.date < todayStr)) missingCheckoutCount++;
    });

    return res.status(200).json({
      success: true,
      count: processedRecords.length,
      data: processedRecords,
      summary: {
        total: processedRecords.length,
        present: presentCount,
        late: lateCount,
        halfDay: halfDayCount,
        missingCheckout: missingCheckoutCount
      }
    });
  } catch (error) {
    console.error('[Get Workforce Attendance Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance records'
    });
  }
});

/**
 * @route   PATCH /api/attendance/:id/correct
 * @desc    HR/Admin manual attendance correction with required reason
 * @access  Private (Admin, HR only)
 */
router.patch('/:id/correct', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { checkIn, checkOut, status, correctionReason } = req.body;

    if (!correctionReason || !correctionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A correction reason is required for manual adjustments.'
      });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    const before = {
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      workedMinutes: attendance.workedMinutes
    };

    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut !== undefined) {
      attendance.checkOut = checkOut ? new Date(checkOut) : null;
    }

    // Recalculate duration if both timestamps are set
    if (attendance.checkIn && attendance.checkOut) {
      const diffMs = attendance.checkOut.getTime() - attendance.checkIn.getTime();
      if (diffMs < 0) {
        return res.status(400).json({
          success: false,
          message: 'Check-out timestamp cannot precede check-in timestamp.'
        });
      }
      attendance.workedMinutes = Math.floor(diffMs / (1000 * 60));
    }

    // Set or override status
    if (status) {
      attendance.status = status;
    } else {
      attendance.status = 'corrected';
    }

    attendance.correctionReason = correctionReason.trim();
    attendance.correctedBy = req.user._id;
    attendance.correctedAt = new Date();

    await attendance.save();

    await attendance.populate({
      path: 'employee',
      select: 'firstName lastName employeeId department designation'
    });
    await attendance.populate('correctedBy', 'name email role');

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Attendance',
      entityId: attendance._id,
      before,
      after: {
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        status: attendance.status,
        workedMinutes: attendance.workedMinutes,
        correctionReason: attendance.correctionReason
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance record corrected successfully',
      data: attendance
    });
  } catch (error) {
    console.error('[Correct Attendance Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to correct attendance record'
    });
  }
});

module.exports = router;
