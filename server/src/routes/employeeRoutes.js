const express = require('express');
const crypto = require('crypto');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

/**
 * Generate a secure, readable temporary password
 */
const generateTempPassword = () => {
  const randomSuffix = crypto.randomBytes(3).toString('hex'); // 6 chars hex
  return `Emp@${randomSuffix}`;
};

/**
 * @route   GET /api/employees/me/profile
 * @desc    Get currently logged in employee's own record
 * @access  Private (Employee, HR, Admin)
 */
router.get('/me/profile', authenticate, async (req, res) => {
  try {
    let employee = await Employee.findOne({ user: req.user._id })
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('user', 'name email role isActive employeeId');

    // Fallback search by employeeId if user reference isn't matched
    if (!employee && req.user.employeeId) {
      employee = await Employee.findOne({ employeeId: req.user.employeeId })
        .populate('department', 'name')
        .populate('designation', 'name')
        .populate('user', 'name email role isActive employeeId');
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'No employee record linked to current user account'
      });
    }

    return res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('[Get My Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * @route   GET /api/employees
 * @desc    Get employee directory with search and filters
 * @access  Private (Admin, HR)
 */
router.get('/', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { search, department, status } = req.query;
    const query = {};

    if (department) {
      query.department = department;
    }

    if (status) {
      query.employmentStatus = status;
    }

    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { employeeId: regex },
        { phone: regex }
      ];
    }

    const employees = await Employee.find(query)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('user', 'name email role isActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('[Get Employees Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve employees'
    });
  }
});

/**
 * @route   POST /api/employees
 * @desc    Register new employee and create User credentials with temporary password
 * @access  Private (Admin, HR)
 */
router.post('/', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      employeeId,
      department,
      designation,
      joiningDate,
      employmentStatus
    } = req.body;

    // Validation
    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Work email is required'
      });
    }

    if (!employeeId || !employeeId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    if (!designation) {
      return res.status(400).json({
        success: false,
        message: 'Designation is required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanEmpId = employeeId.toUpperCase().trim();

    // Check duplicate employee ID
    const existingEmpId = await Employee.findOne({ employeeId: cleanEmpId });
    if (existingEmpId) {
      return res.status(400).json({
        success: false,
        message: `Employee ID '${cleanEmpId}' is already registered`
      });
    }

    // Check duplicate email
    const existingEmpEmail = await Employee.findOne({ email: cleanEmail });
    const existingUserEmail = await User.findOne({ email: cleanEmail });
    if (existingEmpEmail || existingUserEmail) {
      return res.status(400).json({
        success: false,
        message: `An employee account with email '${cleanEmail}' already exists`
      });
    }

    // Check department & designation existence
    const deptDoc = await Department.findById(department);
    if (!deptDoc) {
      return res.status(400).json({
        success: false,
        message: 'Selected department does not exist'
      });
    }

    const desigDoc = await Designation.findById(designation);
    if (!desigDoc) {
      return res.status(400).json({
        success: false,
        message: 'Selected designation does not exist'
      });
    }

    // Generate secure temporary password
    const temporaryPassword = generateTempPassword();

    // Create User account with temporary password & mustChangePassword flag
    const user = await User.create({
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: cleanEmail,
      password: temporaryPassword,
      role: 'employee',
      employeeId: cleanEmpId,
      isActive: true,
      mustChangePassword: true
    });

    // Create Employee Profile linked to user
    const employee = await Employee.create({
      employeeId: cleanEmpId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || 'prefer_not_to_say',
      address: address ? address.trim() : '',
      department,
      designation,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      employmentStatus: employmentStatus || 'active',
      user: user._id
    });

    await employee.populate('department', 'name');
    await employee.populate('designation', 'name');

    createAuditLog({
      actor: req.user,
      action: 'CREATE',
      entity: 'Employee',
      entityId: employee._id,
      before: null,
      after: { employeeId: cleanEmpId, name: `${firstName.trim()} ${lastName.trim()}`, department, designation }
    });

    return res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        employee,
        temporaryPassword // Disclosed once to HR for secure distribution
      }
    });
  } catch (error) {
    console.error('[Create Employee Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to register employee'
    });
  }
});

/**
 * @route   GET /api/employees/:id
 * @desc    Get employee detail / Employee 360
 * @access  Private (Admin/HR any, Employee own record only)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('user', 'name email role isActive employeeId mustChangePassword');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Strict RBAC: Employee can only view their own profile
    if (req.user.role === 'employee') {
      const isOwner =
        (employee.user && employee.user._id.equals(req.user._id)) ||
        employee.employeeId === req.user.employeeId;

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to view your own employee profile'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('[Get Employee Detail Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve employee record'
    });
  }
});

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee information
 * @access  Private (Admin, HR)
 */
router.put('/:id', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      address,
      department,
      designation,
      joiningDate,
      employmentStatus
    } = req.body;

    const before = {
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      designation: employee.designation,
      employmentStatus: employee.employmentStatus
    };

    if (firstName) employee.firstName = firstName.trim();
    if (lastName) employee.lastName = lastName.trim();
    if (phone !== undefined) employee.phone = phone.trim();
    if (dateOfBirth !== undefined) employee.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender) employee.gender = gender;
    if (address !== undefined) employee.address = address.trim();
    if (joiningDate) employee.joiningDate = new Date(joiningDate);
    if (employmentStatus) employee.employmentStatus = employmentStatus;

    if (department && department !== employee.department.toString()) {
      const deptExists = await Department.findById(department);
      if (!deptExists) {
        return res.status(400).json({ success: false, message: 'Department does not exist' });
      }
      employee.department = department;
    }

    if (designation && designation !== employee.designation.toString()) {
      const desigExists = await Designation.findById(designation);
      if (!desigExists) {
        return res.status(400).json({ success: false, message: 'Designation does not exist' });
      }
      employee.designation = designation;
    }

    await employee.save();

    // Sync User name if names were changed
    if (firstName || lastName) {
      await User.findByIdAndUpdate(employee.user, {
        name: `${employee.firstName} ${employee.lastName}`
      });
    }

    await employee.populate('department', 'name');
    await employee.populate('designation', 'name');

    createAuditLog({
      actor: req.user,
      action: 'UPDATE',
      entity: 'Employee',
      entityId: employee._id,
      before,
      after: {
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name || employee.department,
        designation: employee.designation?.name || employee.designation,
        employmentStatus: employee.employmentStatus
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Employee details updated successfully',
      data: employee
    });
  } catch (error) {
    console.error('[Update Employee Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update employee details'
    });
  }
});

module.exports = router;
