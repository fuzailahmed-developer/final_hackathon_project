const Organization = require('../models/Organization');

/**
 * Format a Date object into YYYY-MM-DD representation
 */
const getFormattedDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Fetch organization attendance policies
 */
const getOrgPolicies = async () => {
  const org = await Organization.findOne().sort({ createdAt: -1 });
  return {
    officeStartTime: org?.officeStartTime || '09:00',
    gracePeriodMinutes: org?.gracePeriodMinutes !== undefined ? org.gracePeriodMinutes : 15,
    halfDayHours: org?.halfDayHours !== undefined ? org.halfDayHours : 5,
    weekendDays: org?.weekendDays || ['Saturday', 'Sunday']
  };
};

/**
 * Check whether a check-in timestamp is late according to organization policies.
 * Office start: 09:00, Grace: 15 min.
 * Check-in <= 09:15 is NOT late (status: present).
 * Check-in > 09:15 is late (status: late).
 */
const calculateLateness = (checkInDate, officeStartTimeStr = '09:00', graceMinutes = 15) => {
  const [startHour, startMin] = officeStartTimeStr.split(':').map(Number);

  const checkInHour = checkInDate.getHours();
  const checkInMin = checkInDate.getMinutes();

  const checkInTotalMins = checkInHour * 60 + checkInMin;
  const officeStartTotalMins = startHour * 60 + startMin;
  const graceThresholdMins = officeStartTotalMins + graceMinutes;

  if (checkInTotalMins > graceThresholdMins) {
    const lateMinutes = checkInTotalMins - officeStartTotalMins;
    return {
      isLate: true,
      status: 'late',
      lateMinutes
    };
  }

  return {
    isLate: false,
    status: 'present',
    lateMinutes: 0
  };
};

/**
 * Calculate worked duration and final status upon checkout
 */
const calculateCheckout = (checkInDate, checkOutDate, initialStatus = 'present', halfDayHours = 5) => {
  const diffMs = checkOutDate.getTime() - checkInDate.getTime();
  if (diffMs < 0) {
    throw new Error('Check-out timestamp cannot precede check-in timestamp.');
  }

  const workedMinutes = Math.floor(diffMs / (1000 * 60));
  const halfDayMinutesThreshold = halfDayHours * 60;

  let finalStatus = initialStatus;

  // If worked hours are under the half-day threshold (e.g. under 5 hours)
  if (workedMinutes < halfDayMinutesThreshold) {
    finalStatus = 'half_day';
  }

  return {
    workedMinutes,
    status: finalStatus
  };
};

module.exports = {
  getFormattedDate,
  getOrgPolicies,
  calculateLateness,
  calculateCheckout
};
