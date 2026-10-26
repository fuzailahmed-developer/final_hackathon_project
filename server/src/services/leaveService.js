const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Holiday = require('../models/Holiday');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');

/**
 * Calculate number of working days between two dates (inclusive).
 * Excludes weekends based on organization.weekendDays and holidays.
 */
async function calculateWorkingDays(startDate, endDate) {
  if (endDate < startDate) {
    throw new Error('End date cannot be before start date.');
  }

  // Load organization policies (weekend days)
  const org = await Organization.findOne().sort({ createdAt: -1 });
  const weekendDays = org?.weekendDays || ['Saturday', 'Sunday'];
  const weekendSet = new Set(weekendDays.map(d => d.toLowerCase()));

  // Load holidays within range
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate }
  }).select('date');
  const holidaySet = new Set(holidays.map(h => h.date.toDateString()));

  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayName = current.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const isWeekend = weekendSet.has(dayName);
    const isHoliday = holidaySet.has(current.toDateString());
    if (!isWeekend && !isHoliday) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Get leave balance for an employee.
 * Returns array of objects { leaveType, quota, used, pending, remaining }.
 */
async function getLeaveBalance(employeeId) {
  // Fetch all active leave types
  const leaveTypes = await LeaveType.find({ isActive: true }).lean();

  const empObjId = new mongoose.Types.ObjectId(employeeId);

  // Approved leaves (used)
  const approvedLeaves = await LeaveRequest.aggregate([
    { $match: { employee: empObjId, status: 'approved' } },
    { $group: { _id: '$leaveType', usedDays: { $sum: '$totalDays' } } }
  ]);

  // Pending leaves (reservation)
  const pendingLeaves = await LeaveRequest.aggregate([
    { $match: { employee: empObjId, status: 'pending' } },
    { $group: { _id: '$leaveType', pendingDays: { $sum: '$totalDays' } } }
  ]);

  return leaveTypes.map(lt => {
    const usedObj = approvedLeaves.find(u => u._id.toString() === lt._id.toString());
    const pendingObj = pendingLeaves.find(p => p._id.toString() === lt._id.toString());
    const used = usedObj ? usedObj.usedDays : 0;
    const pending = pendingObj ? pendingObj.pendingDays : 0;
    const quota = lt.isUnpaid ? null : lt.annualQuota;
    const remaining = lt.isUnpaid ? null : Math.max(0, quota - used - pending);
    return {
      leaveType: lt.name,
      quota,
      used,
      pending,
      remaining
    };
  });
}

module.exports = { calculateWorkingDays, getLeaveBalance };
