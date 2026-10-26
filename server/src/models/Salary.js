const mongoose = require('mongoose');

/**
 * Salary structure for an employee.
 * Supports history via multiple active periods.
 */
const salarySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    basicSalary: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date }, // null means current
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Salary', salarySchema);
