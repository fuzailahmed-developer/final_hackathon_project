const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    reason: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    cancellationReason: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
