const mongoose = require('mongoose');

/**
 * Individual employee payroll item (snapshot).
 */
const payrollItemSchema = new mongoose.Schema(
  {
    payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    basicSalary: { type: Number, required: true },
    hra: { type: Number, required: true },
    medical: { type: Number, required: true },
    grossSalary: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    presentDays: { type: Number, required: true },
    halfDays: { type: Number, required: true },
    absentDays: { type: Number, required: true },
    paidLeaveDays: { type: Number, required: true },
    unpaidLeaveDays: { type: Number, required: true },
    deductibleDays: { type: Number, required: true },
    absenceDeduction: { type: Number, required: true },
    unpaidLeaveDeduction: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    tax: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    joiningDate: { type: Date },
    leavingDate: { type: Date },
    // snapshot of the salary record used for this payroll run
    salarySnapshot: {
      basicSalary: Number,
      hra: Number,
      medical: Number,
      effectiveFrom: Date,
      effectiveTo: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PayrollItem', payrollItemSchema);
