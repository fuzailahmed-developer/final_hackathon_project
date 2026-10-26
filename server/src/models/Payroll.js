const mongoose = require('mongoose');

/**
 * Payroll run for a given month/year.
 */
const payrollSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
    employeeCount: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    finalizedAt: { type: Date },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payroll', payrollSchema);
