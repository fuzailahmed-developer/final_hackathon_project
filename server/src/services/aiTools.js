const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Organization = require('../models/Organization');
const LeaveType = require('../models/LeaveType');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const PayrollItem = require('../models/PayrollItem');
const analyticsService = require('./analyticsService');
const { getLeaveBalance } = require('./leaveService');

/**
 * Helper: Resolve employee record for the authenticated user
 */
const resolveEmployee = async (user) => {
  if (!user) return null;
  let employee = await Employee.findOne({ user: user._id }).populate('department designation');
  if (!employee && user.employeeId) {
    employee = await Employee.findOne({ employeeId: user.employeeId }).populate('department designation');
  }
  return employee;
};

/**
 * Tool 1: get_headcount
 */
async function get_headcount(args, user) {
  if (user.role === 'employee') {
    return {
      error: 'Permission denied: Employee role cannot query company-wide workforce headcount. You may inquire about your personal profile and team.'
    };
  }

  const { department } = args || {};
  let filter = { employmentStatus: { $ne: 'inactive' } };

  if (department) {
    const deptDoc = await Department.findOne({
      name: { $regex: new RegExp(`^${department.trim()}$`, 'i') }
    });
    if (deptDoc) {
      filter.department = deptDoc._id;
    } else {
      return {
        count: 0,
        department,
        message: `No department matching "${department}" was found in the database.`
      };
    }
  }

  const count = await Employee.countDocuments(filter);
  return {
    count,
    department: department || 'All Departments',
    status: 'active'
  };
}

/**
 * Tool 2: get_attendance_summary
 */
async function get_attendance_summary(args, user) {
  if (user.role === 'employee') {
    // Return only personal attendance summary
    const emp = await resolveEmployee(user);
    if (!emp) return { error: 'Employee profile not found' };

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = await Attendance.findOne({ employee: emp._id, date: todayStr });
    const lateCount = await Attendance.countDocuments({
      employee: emp._id,
      status: 'late',
      date: { $gte: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01` }
    });

    return {
      scope: 'personal',
      todayStatus: todayRecord ? todayRecord.status : 'Not checked in',
      checkInTime: todayRecord?.checkIn || null,
      checkOutTime: todayRecord?.checkOut || null,
      monthLateCount: lateCount
    };
  }

  // Admin & HR: company-wide attendance metrics
  const hrData = await analyticsService.getHrDashboard({});
  const total = hrData.kpis.headcount || 1;
  const present = hrData.kpis.presentToday || 0;
  const attendanceRate = total > 0 ? `${((present / total) * 100).toFixed(1)}%` : '0%';

  return {
    scope: 'company',
    totalHeadcount: total,
    presentToday: present,
    lateToday: hrData.kpis.lateToday || 0,
    onLeaveToday: hrData.kpis.onLeaveToday || 0,
    attendanceRate
  };
}

/**
 * Tool 3: get_late_comers
 */
async function get_late_comers(args, user) {
  if (user.role === 'employee') {
    const emp = await resolveEmployee(user);
    if (!emp) return { error: 'Employee profile not found' };

    const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const lateCount = await Attendance.countDocuments({
      employee: emp._id,
      status: 'late',
      date: { $gte: monthStart }
    });

    return {
      scope: 'personal',
      notice: 'Company-wide late arrivals are restricted to HR and Admin roles. Here is your personal punctuality record:',
      monthLateCount: lateCount
    };
  }

  // Admin & HR: Top late comers
  const hrData = await analyticsService.getHrDashboard({});
  return {
    scope: 'company',
    topLateComers: hrData.topLateComers || []
  };
}

/**
 * Tool 4: get_leave_summary
 */
async function get_leave_summary(args, user) {
  if (user.role === 'employee') {
    return {
      error: 'Permission denied: Company-wide leave summaries are restricted to HR and Admin managers. To view your own leave quota, use get_my_leave_balance.'
    };
  }

  const hrData = await analyticsService.getHrDashboard({});
  return {
    onLeaveToday: hrData.kpis.onLeaveToday || 0,
    pendingApprovals: hrData.kpis.pendingApprovals || 0,
    leaveByType: hrData.leaveByType || []
  };
}

/**
 * Tool 5: get_my_leave_balance
 */
async function get_my_leave_balance(args, user) {
  const emp = await resolveEmployee(user);
  if (!emp) {
    return { error: 'No employee record linked to current user account.' };
  }

  const balances = await getLeaveBalance(emp._id);
  return {
    employee: `${emp.firstName} ${emp.lastName}`,
    employeeId: emp.employeeId,
    balances: balances.map((b) => ({
      leaveType: b.leaveType,
      quota: b.quota,
      used: b.used,
      pending: b.pending,
      remaining: b.remaining
    }))
  };
}

/**
 * Tool 6: get_payroll_summary
 */
async function get_payroll_summary(args, user) {
  // If employee asks: strictly personal payslip info ONLY
  if (user.role === 'employee') {
    const emp = await resolveEmployee(user);
    if (!emp) return { error: 'Employee profile not found' };

    const lastItem = await PayrollItem.findOne({ employee: emp._id })
      .populate({ path: 'payroll', match: { status: 'finalized' }, select: 'month year status' })
      .sort({ createdAt: -1 });

    if (!lastItem || !lastItem.payroll) {
      return {
        scope: 'personal',
        message: 'No finalized payslip record found for your account.'
      };
    }

    return {
      scope: 'personal',
      month: lastItem.payroll.month,
      year: lastItem.payroll.year,
      netSalary: lastItem.netSalary,
      status: lastItem.payroll.status
    };
  }

  // Admin & HR: company-level finalized payroll cost
  const adminData = await analyticsService.getAdminDashboard({});
  return {
    scope: 'company',
    totalPayrollCost: adminData.kpis.payrollCost || 0,
    averageSalary: adminData.kpis.averageSalary || 0,
    byDepartment: adminData.payrollCostByDepartment || []
  };
}

/**
 * Tool 7: search_employees
 */
async function search_employees(args, user) {
  if (user.role === 'employee') {
    return {
      error: 'Permission denied: Directory employee search via AI is restricted to HR and Admin roles.'
    };
  }

  const { query, department } = args || {};
  const filter = { employmentStatus: { $ne: 'inactive' } };

  if (query) {
    filter.$or = [
      { firstName: { $regex: query, $options: 'i' } },
      { lastName: { $regex: query, $options: 'i' } },
      { employeeId: { $regex: query, $options: 'i' } }
    ];
  }

  if (department) {
    const deptDoc = await Department.findOne({
      name: { $regex: new RegExp(`^${department.trim()}$`, 'i') }
    });
    if (deptDoc) {
      filter.department = deptDoc._id;
    }
  }

  const employees = await Employee.find(filter)
    .select('firstName lastName employeeId department designation employmentStatus joiningDate')
    .populate('department', 'name')
    .populate('designation', 'name')
    .limit(10)
    .lean();

  return {
    count: employees.length,
    employees: employees.map((e) => ({
      name: `${e.firstName} ${e.lastName}`,
      employeeId: e.employeeId,
      department: e.department?.name || 'Unassigned',
      designation: e.designation?.name || '—',
      employmentStatus: e.employmentStatus
    }))
  };
}

/**
 * Fetch company policy rules for grounding policy questions
 */
async function get_company_policy_context() {
  const org = await Organization.findOne().sort({ createdAt: -1 });
  const leaveTypes = await LeaveType.find({ isActive: true }).select('name annualQuota isPaid isUnpaid');

  return {
    companyName: org?.companyName || 'HCM Lite Demo Corp',
    officeStartTime: org?.officeStartTime || '09:00',
    officeEndTime: org?.officeEndTime || '17:00',
    gracePeriodMinutes: org?.gracePeriodMinutes || 15,
    halfDayMinutes: org?.halfDayMinutes || 240,
    weekendDays: org?.weekendDays || ['Saturday', 'Sunday'],
    leavePolicies: leaveTypes.map((lt) => ({
      name: lt.name,
      annualQuota: lt.annualQuota,
      isPaid: lt.isPaid
    }))
  };
}

// Tool Registry Map
const TOOLS = {
  get_headcount,
  get_attendance_summary,
  get_late_comers,
  get_leave_summary,
  get_my_leave_balance,
  get_payroll_summary,
  search_employees
};

// Tool Specifications for LLM Function Calling
const TOOL_DEFINITIONS = [
  {
    name: 'get_headcount',
    description: 'Get the active employee headcount for the company or a specific department (Admin/HR only).',
    parameters: {
      type: 'object',
      properties: {
        department: { type: 'string', description: 'Department name e.g. Engineering, HR, Sales' }
      }
    }
  },
  {
    name: 'get_attendance_summary',
    description: 'Get attendance overview metrics. Admin/HR receive company-wide presence and rates; employees receive their personal daily attendance status.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_late_comers',
    description: 'Get top employees with frequent late arrivals. Admin/HR only.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_leave_summary',
    description: 'Get company leave metrics: employees on leave today, leave by type, and pending approvals. Admin/HR only.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_my_leave_balance',
    description: 'Get the logged-in user\'s personal leave balances across Annual, Sick, Casual, and Unpaid leave types.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'get_payroll_summary',
    description: 'Get payroll metrics. Admin gets company total payroll cost; employee gets personal latest payslip only. NEVER call this to look up another employee\'s salary.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'search_employees',
    description: 'Search active employees in the directory by name or department. Admin/HR only. Passwords and compensation are NEVER returned.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search name or employee ID' },
        department: { type: 'string', description: 'Filter by department name' }
      }
    }
  }
];

module.exports = {
  TOOLS,
  TOOL_DEFINITIONS,
  get_company_policy_context,
  resolveEmployee
};
