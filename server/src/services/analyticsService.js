// server/src/services/analyticsService.js
// Centralized analytics for dashboards. All calculations are performed server‑side using MongoDB aggregation.
// Returned JSON structures are designed for consumption by the frontend dashboard components.

const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const Payroll = require('../models/Payroll');
const PayrollItem = require('../models/PayrollItem');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Salary = require('../models/Salary');
const Holiday = require('../models/Holiday');

/** Helper: build date range filter for MongoDB */
function dateRangeFilter(start, end) {
  const filter = {};
  if (start) filter.$gte = new Date(start);
  if (end) filter.$lte = new Date(end);
  return Object.keys(filter).length ? filter : null;
}

/** Helper: get working days in a period for an organization */
async function getWorkingDays(startDate, endDate) {
  // Use organization weekend config and holiday collection.
  const org = await require('../models/Organization').findOne();
  const weekendDays = org?.weekendDays || [0, 6]; // Sunday=0
  const holidays = await Holiday.find({ date: { $gte: startDate, $lte: endDate } }).select('date -_id');
  const holidaySet = new Set(holidays.map(h => h.date.toDateString()));
  let workingDays = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (!weekendDays.includes(day) && !holidaySet.has(d.toDateString())) {
      workingDays++;
    }
  }
  return workingDays;
}

/** ADMIN DASHBOARD */
async function getAdminDashboard({ startDate, endDate }) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;

  const [headcount, payrollCostAgg, avgSalaryAgg, attritionAgg] = await Promise.all([
    // Total active headcount (employees with employmentStatus != 'inactive')
    Employee.countDocuments({ employmentStatus: { $ne: 'inactive' } }),
    // Payroll cost (sum of net in finalized payrolls within range)
    PayrollItem.aggregate([
      { $match: { payroll: { $exists: true } } },
      { $lookup: { from: 'payrolls', localField: 'payroll', foreignField: '_id', as: 'pay' } },
      { $unwind: '$pay' },
      { $match: { 'pay.status': 'finalized', 'pay.month': { $gte: start.getMonth() + 1, $lte: end.getMonth() + 1 }, 'pay.year': { $gte: start.getFullYear(), $lte: end.getFullYear() } } },
      { $group: { _id: null, totalNet: { $sum: '$netSalary' } } }
    ]),
    // Average salary (basic) for active employees (latest active salary)
    Salary.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$employee', avgBasic: { $avg: '$basicSalary' } } },
      { $group: { _id: null, avgSalary: { $avg: '$avgBasic' } } }
    ]),
    // Attrition YTD – count employees with leavingDate in current year / starting headcount of year
    (async () => {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const leftCount = await Employee.countDocuments({ leavingDate: { $gte: yearStart, $lte: now } });
      const startHeadcount = await Employee.countDocuments({ joiningDate: { $lte: yearStart }, $or: [{ leavingDate: null }, { leavingDate: { $gt: now } }] });
      if (startHeadcount === 0) return { value: null, available: false, reason: 'Exit date data is not available' };
      const attrition = (leftCount / startHeadcount) * 100;
      return { value: attrition.toFixed(2), available: true };
    })()
  ]);

  const payrollCost = payrollCostAgg[0] ? payrollCostAgg[0].totalNet : 0;
  const avgSalary = avgSalaryAgg[0] ? avgSalaryAgg[0].avgSalary : 0;

  // Headcount by department
  const headcountByDept = await Employee.aggregate([
    { $match: { employmentStatus: { $ne: 'inactive' } } },
    { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$dept.name', count: { $sum: 1 } } },
    { $project: { department: { $ifNull: ['$_id', 'Unassigned'] }, count: 1, _id: 0 } },
    { $sort: { count: -1 } }
  ]);

  // Payroll cost by department (finalized payroll items)
  const payrollCostByDeptAgg = await PayrollItem.aggregate([
    { $lookup: { from: 'payrolls', localField: 'payroll', foreignField: '_id', as: 'pay' } },
    { $unwind: '$pay' },
    { $match: { 'pay.status': 'finalized' } },
    { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'emp' } },
    { $unwind: '$emp' },
    { $lookup: { from: 'departments', localField: 'emp.department', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$dept.name', total: { $sum: '$netSalary' } } },
    { $project: { department: { $ifNull: ['$_id', 'Unassigned'] }, total: 1, _id: 0 } },
    { $sort: { total: -1 } }
  ]);

  // Gender distribution (if gender field exists)
  const genderDistAgg = await Employee.aggregate([
    { $match: { gender: { $exists: true, $ne: null, $nin: ['', 'prefer_not_to_say'] } } },
    { $group: { _id: '$gender', count: { $sum: 1 } } },
    { $project: { gender: '$_id', count: 1, _id: 0 } }
  ]);

  // Tenure distribution
  const tenureBuckets = [
    { label: '< 1 year', max: 1 },
    { label: '1–3 years', min: 1, max: 3 },
    { label: '3–5 years', min: 3, max: 5 },
    { label: '5+ years', min: 5 }
  ];
  const tenureAggPromises = tenureBuckets.map(b => {
    const match = { employmentStatus: { $ne: 'inactive' } };
    if (b.min !== undefined) {
      const minDate = new Date(now);
      minDate.setFullYear(now.getFullYear() - b.min);
      match.joiningDate = { $lte: minDate };
    }
    if (b.max !== undefined) {
      const maxDate = new Date(now);
      maxDate.setFullYear(now.getFullYear() - b.max);
      match.joiningDate = match.joiningDate ? { ...match.joiningDate, $gt: maxDate } : { $gt: maxDate };
    }
    return Employee.countDocuments(match).then(cnt => ({ label: b.label, count: cnt }));
  });
  const tenureDistribution = await Promise.all(tenureAggPromises);

  return {
    kpis: {
      headcount,
      payrollCost,
      averageSalary: avgSalary,
      attritionYTD: attritionAgg.value,
      attritionAvailable: attritionAgg.available,
      attritionReason: attritionAgg.reason || null
    },
    headcountByDepartment: headcountByDept,
    payrollCostByDepartment: payrollCostByDeptAgg,
    genderDistribution: genderDistAgg,
    tenureDistribution,
    recentActivity: [] // placeholder for future audit feed
  };
}

/** HR DASHBOARD */
async function getHrDashboard({ startDate, endDate }) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate) : now;
  
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [headcount, presentToday, onLeaveToday, lateToday, pendingApprovals] = await Promise.all([
    Employee.countDocuments({ employmentStatus: { $ne: 'inactive' } }),
    Attendance.countDocuments({ date: todayStr, status: { $in: ['present', 'late', 'half_day', 'corrected'] } }),
    LeaveRequest.countDocuments({
      status: 'approved',
      startDate: { $lte: now },
      endDate: { $gte: now }
    }),
    Attendance.countDocuments({ date: todayStr, status: 'late' }),
    LeaveRequest.countDocuments({ status: 'pending' })
  ]);

  // Attendance trend over range (using String YYYY-MM-DD comparison)
  const attendanceTrend = await Attendance.aggregate([
    { $match: { date: { $gte: startStr, $lte: endStr } } },
    { $group: {
      _id: '$date',
      present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
      late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
      halfDay: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
      missingCheckout: { $sum: { $cond: [{ $eq: ['$status', 'missing_checkout'] }, 1, 0] } }
    } },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', present: 1, late: 1, halfDay: 1, missingCheckout: 1, _id: 0 } }
  ]);

  // Absenteeism / missed work by department in range
  const absenteeByDept = await Attendance.aggregate([
    { $match: { date: { $gte: startStr, $lte: endStr }, status: { $in: ['missing_checkout', 'half_day'] } } },
    { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'emp' } },
    { $unwind: '$emp' },
    { $lookup: { from: 'departments', localField: 'emp.department', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$dept.name', absentDays: { $sum: 1 } } },
    { $project: { department: { $ifNull: ['$_id', 'General'] }, absentDays: 1, _id: 0 } }
  ]);

  // Leave by type (approved only within range, using totalDays)
  const leaveByType = await LeaveRequest.aggregate([
    { $match: { status: 'approved', startDate: { $lte: end }, endDate: { $gte: start } } },
    { $lookup: { from: 'leavetypes', localField: 'leaveType', foreignField: '_id', as: 'type' } },
    { $unwind: '$type' },
    { $group: { _id: '$type.name', days: { $sum: '$totalDays' } } },
    { $project: { leaveType: '$_id', days: 1, _id: 0 } }
  ]);

  // Top 5 late comers (count of late status)
  const topLateComers = await Attendance.aggregate([
    { $match: { status: 'late' } },
    { $group: { _id: '$employee', lateCount: { $sum: 1 }, totalLateMinutes: { $sum: '$lateMinutes' } } },
    { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'emp' } },
    { $unwind: '$emp' },
    { $lookup: { from: 'departments', localField: 'emp.department', foreignField: '_id', as: 'dept' } },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
    { $project: {
      employeeId: '$emp.employeeId',
      name: { $concat: ['$emp.firstName', ' ', '$emp.lastName'] },
      department: { $ifNull: ['$dept.name', 'General'] },
      lateCount: 1,
      totalLateMinutes: 1
    } },
    { $sort: { lateCount: -1 } },
    { $limit: 5 }
  ]);

  // Pending leave approvals (list) – limited to 10 for UI
  const pendingLeaves = await LeaveRequest.find({ status: 'pending' })
    .populate('employee', 'firstName lastName employeeId department')
    .populate('leaveType', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const formattedPending = pendingLeaves.map(l => ({
    employeeName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Unknown',
    employeeId: l.employee?.employeeId || 'N/A',
    department: l.employee?.department?.name || 'N/A',
    leaveType: l.leaveType?.name || 'Leave',
    startDate: l.startDate,
    endDate: l.endDate,
    workingDays: l.totalDays || 1,
    submittedAt: l.createdAt,
    _id: l._id
  }));

  return {
    kpis: { headcount, presentToday, onLeaveToday, lateToday, pendingApprovals },
    attendanceTrend,
    absenteeismByDepartment: absenteeByDept,
    leaveByType,
    topLateComers,
    pendingLeaves: formattedPending
  };
}

/** EMPLOYEE DASHBOARD */
async function getEmployeeDashboard(userOrId) {
  let employee = null;
  if (userOrId && typeof userOrId === 'object' && userOrId._id) {
    employee = await Employee.findOne({ user: userOrId._id }).populate('department designation').lean();
    if (!employee && userOrId.employeeId) {
      employee = await Employee.findOne({ employeeId: userOrId.employeeId }).populate('department designation').lean();
    }
  } else if (typeof userOrId === 'string') {
    if (mongoose.Types.ObjectId.isValid(userOrId)) {
      employee = await Employee.findOne({ $or: [{ _id: userOrId }, { user: userOrId }, { employeeId: userOrId }] }).populate('department designation').lean();
    } else {
      employee = await Employee.findOne({ employeeId: userOrId }).populate('department designation').lean();
    }
  }
  if (!employee) throw new Error('Employee not found');

  // Today's attendance record
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = await Attendance.findOne({ employee: employee._id, date: todayStr }).lean();

  // Hours this week (Mon-Sun)
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const weekAttendances = await Attendance.find({
    employee: employee._id,
    date: { $gte: weekStartStr, $lte: weekEndStr }
  }).lean();

  const totalMinutes = weekAttendances.reduce((sum, a) => sum + (a.workedMinutes || 0), 0);
  const hoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  // Late count (current month)
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lateCount = await Attendance.countDocuments({
    employee: employee._id,
    status: 'late',
    date: { $gte: monthStartStr, $lte: todayStr }
  });

  // Leave balance – reuse existing service getLeaveBalance
  const leaveBalances = await require('../services/leaveService').getLeaveBalance(employee._id);

  // Last payslip – latest finalized payroll item for this employee
  const lastPayrollItem = await PayrollItem.findOne({ employee: employee._id })
    .populate({ path: 'payroll', match: { status: 'finalized' }, select: 'month year status' })
    .sort({ createdAt: -1 })
    .lean();

  const lastPayslip = (lastPayrollItem && lastPayrollItem.payroll) ? {
    month: lastPayrollItem.payroll.month,
    year: lastPayrollItem.payroll.year,
    netSalary: lastPayrollItem.netSalary,
    status: lastPayrollItem.payroll.status,
    payrollId: lastPayrollItem.payroll._id,
    itemId: lastPayrollItem._id
  } : null;

  return {
    attendance: todayAttendance || null,
    weeklyHours: { worked: hoursStr, totalMinutes, target: '40h' },
    lateCount,
    leaveBalance: leaveBalances,
    lastPayslip
  };
}

module.exports = {
  getAdminDashboard,
  getHrDashboard,
  getEmployeeDashboard,
  // Exported helpers (potential future use)
  getWorkingDays,
  dateRangeFilter
};
