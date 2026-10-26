const mongoose = require('mongoose');
const Payroll = require('../models/Payroll');
const PayrollItem = require('../models/PayrollItem');
const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const Organization = require('../models/Organization');
const Holiday = require('../models/Holiday');

/**
 * Utility: calculate working days in a period for the whole organization.
 * Excludes weekends (org.weekendDays) and holidays.
 */
async function getWorkingDaysInMonth(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  // org weekend config
  const org = await Organization.findOne().sort({ createdAt: -1 });
  const weekendDays = org?.weekendDays || ['Saturday', 'Sunday'];
  const weekendSet = new Set(weekendDays.map(d => d.toLowerCase()));
  // holidays in month
  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end }
  }).select('date');
  const holidaySet = new Set(holidays.map(h => h.date.toDateString()));
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = d.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    if (!weekendSet.has(dayName) && !holidaySet.has(d.toDateString())) {
      count++;
    }
  }
  return { total: count, start, end };
}

/**
 * Get salary record active for employee on a specific date.
 */
async function getActiveSalary(employeeId, date) {
  const salary = await Salary.findOne({
    employee: employeeId,
    isActive: true,
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }]
  }).sort({ effectiveFrom: -1 });
  return salary;
}

/**
 * Calculate gross salary components.
 */
function calculateGross(basic) {
  const hra = Math.round(basic * 0.4);
  const medical = Math.round(basic * 0.1);
  const gross = basic + hra + medical;
  return { basic, hra, medical, gross };
}

/**
 * Calculate attendance based deductions.
 * Returns object with presentDays, halfDays, absentDays, paidLeaveDays, unpaidLeaveDays, deductibleDays, absenceDeduction, unpaidLeaveDeduction, totalDeductions.
 */
async function calculateAttendanceDeductions(employeeId, workingDaysInfo, month, year) {
  const { total: workingDays, start, end } = workingDaysInfo;
  // fetch attendance records for month
  const attendances = await Attendance.find({
    employee: employeeId,
    date: { $gte: start, $lte: end }
  });

  // fetch approved leaves in period
  const approvedLeaves = await LeaveRequest.find({
    employee: employeeId,
    status: 'approved',
    $or: [
      { startDate: { $gte: start, $lte: end } },
      { endDate: { $gte: start, $lte: end } },
      { startDate: { $lte: start }, endDate: { $gte: end } }
    ]
  }).populate('leaveType');

  // map leave dates to type
  const leaveMap = {};
  for (const lr of approvedLeaves) {
    const lt = lr.leaveType;
    const isUnpaid = lt.isUnpaid;
    const curStart = lr.startDate < start ? start : lr.startDate;
    const curEnd = lr.endDate > end ? end : lr.endDate;
    for (let d = new Date(curStart); d <= curEnd; d.setDate(d.getDate() + 1)) {
      const key = d.toDateString();
      leaveMap[key] = { isUnpaid };
    }
  }

  let present = 0,
    half = 0,
    absent = 0,
    paidLeave = 0,
    unpaidLeave = 0;

  // iterate through each working day
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toDateString();
    // check if attendance record exists for this day
    const att = attendances.find(a => a.date.toDateString() === dayStr);
    if (att) {
      if (att.isHalfDay) half++;
      else present++;
      continue;
    }
    // no attendance: check leave map
    if (leaveMap[dayStr]) {
      if (leaveMap[dayStr].isUnpaid) unpaidLeave++;
      else paidLeave++;
    } else {
      absent++;
    }
  }

  const deductibleDays = absent + unpaidLeave + half * 0.5;
  const perDayGross = 0; // placeholder, will be multiplied later after gross known
  return { present, half, absent, paidLeave, unpaidLeave, deductibleDays, perDayGross };
}

/**
 * Simple illustrative tax slab (annualized). Adjust as needed.
 */
function calculateTax(annualGross) {
  // Example slabs (PKR): 0-600k: 0%; 600k-1.2M: 5%; >1.2M: 10%
  let tax = 0;
  if (annualGross > 1200000) {
    tax = (annualGross - 1200000) * 0.1 + (1200000 - 600000) * 0.05;
  } else if (annualGross > 600000) {
    tax = (annualGross - 600000) * 0.05;
  }
  return Math.round(tax / 12); // monthly tax
}

/**
 * Calculate payroll for a single employee for month/year.
 */
async function calculateEmployeePayroll(employeeId, month, year) {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error('Employee not found');
  const workingDaysInfo = await getWorkingDaysInMonth(month, year);

  // Determine active portion based on joining/leaving dates
  const periodStart = workingDaysInfo.start;
  const periodEnd = workingDaysInfo.end;
  const join = employee.joiningDate || periodStart;
  const leave = employee.leavingDate || periodEnd;

  // If employee joined after the payroll month ends, or left before it started, they are not part of this payroll
  if (join > periodEnd || leave < periodStart) {
    return null;
  }

  const effectiveStart = join > periodStart ? join : periodStart;
  const effectiveEnd = leave < periodEnd ? leave : periodEnd;

  // adjust working days count for proration
  const prorationInfo = await getWorkingDaysInMonth(month, year);
  const totalWorkingDays = prorationInfo.total;
  // compute prorated working days for this employee
  let employeeWorkingDays = 0;
  for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
    const dayName = d.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const isWeekend = employee.organization?.weekendDays?.includes(dayName) || false; // fallback not needed
    const isHoliday = await Holiday.findOne({ date: d });
    if (!isWeekend && !isHoliday) employeeWorkingDays++;
  }

  if (employeeWorkingDays <= 0) {
    return null;
  }

  // get salary effective on employeeWorkingDays start date
  const salaryRec = await getActiveSalary(employeeId, effectiveStart);
  if (!salaryRec) {
    return null; // no salary configured
  }
  const { basic, hra, medical, gross } = calculateGross(salaryRec.basicSalary);

  // attendance deductions based on actual working days (prorated)
  const attendanceInfo = await calculateAttendanceDeductions(employeeId, { total: employeeWorkingDays, start: effectiveStart, end: effectiveEnd }, month, year);
  const perDayGross = employeeWorkingDays > 0 ? (gross / employeeWorkingDays) : 0;
  const absenceDeduction = perDayGross * (attendanceInfo.absent || 0);
  const unpaidLeaveDeduction = perDayGross * (attendanceInfo.unpaidLeave || 0);
  const totalDeductions = absenceDeduction + unpaidLeaveDeduction;
  const tax = calculateTax(gross);
  const net = gross - totalDeductions - tax;

  return {
    employee: employeeId,
    basicSalary: basic,
    hra,
    medical,
    grossSalary: gross,
    workingDays: employeeWorkingDays,
    presentDays: attendanceInfo.present,
    halfDays: attendanceInfo.half,
    absentDays: attendanceInfo.absent,
    paidLeaveDays: attendanceInfo.paidLeave,
    unpaidLeaveDays: attendanceInfo.unpaidLeave,
    deductibleDays: attendanceInfo.deductibleDays,
    absenceDeduction,
    unpaidLeaveDeduction,
    totalDeductions,
    tax,
    netSalary: net,
    joiningDate: employee.joiningDate,
    leavingDate: employee.leavingDate,
    salarySnapshot: {
      basicSalary: salaryRec.basicSalary,
      hra,
      medical,
      effectiveFrom: salaryRec.effectiveFrom,
      effectiveTo: salaryRec.effectiveTo
    }
  };
}

/**
 * Generate or recalculate payroll draft for month/year.
 */
async function calculateMonthlyPayroll(month, year, initiatedBy) {
  // Ensure a payroll record exists (draft)
  let payroll = await Payroll.findOne({ month, year });
  if (payroll && payroll.status === 'finalized') {
    throw new Error('Finalized payroll cannot be modified.');
  }
  if (!payroll) {
    payroll = new Payroll({ month, year, createdBy: initiatedBy, status: 'draft' });
  }

  // fetch active employees
  const employees = await Employee.find({ employmentStatus: 'active' });

  // clear prior items for draft regeneration
  await PayrollItem.deleteMany({ payroll: payroll._id });

  let totals = { employeeCount: 0, totalGross: 0, totalDeductions: 0, totalNet: 0 };

  for (const emp of employees) {
    const item = await calculateEmployeePayroll(emp._id, month, year);
    if (!item) continue; // skip if no salary config
    const payrollItem = new PayrollItem({ payroll: payroll._id, ...item });
    await payrollItem.save();
    totals.employeeCount++;
    totals.totalGross += item.grossSalary;
    totals.totalDeductions += item.totalDeductions + item.tax;
    totals.totalNet += item.netSalary;
  }

  payroll.employeeCount = totals.employeeCount;
  payroll.totalGross = totals.totalGross;
  payroll.totalDeductions = totals.totalDeductions;
  payroll.totalNet = totals.totalNet;
  payroll.updatedBy = initiatedBy;
  await payroll.save();
  return payroll;
}

/**
 * Finalize a draft payroll.
 */
async function finalizePayroll(payrollId, finalizedBy) {
  const payroll = await Payroll.findById(payrollId);
  if (!payroll) throw new Error('Payroll not found');
  if (payroll.status === 'finalized') throw new Error('Payroll already finalized');
  // lock payroll items - they are already snapshots; no further action needed.
  payroll.status = 'finalized';
  payroll.finalizedAt = new Date();
  payroll.finalizedBy = finalizedBy;
  await payroll.save();
  return payroll;
}

/**
 * Get payroll by month/year (with items populated).
 */
async function getPayrollByMonth(month, year) {
  return await Payroll.findOne({ month, year }).populate('createdBy updatedBy');
}

module.exports = {
  calculateMonthlyPayroll,
  calculateEmployeePayroll,
  finalizePayroll,
  getPayrollByMonth,
  getWorkingDaysInMonth,
  calculateGross,
  calculateTax
};
