const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Leave type name is required'],
      unique: true,
      trim: true
    },
    annualQuota: {
      type: Number,
      required: [true, 'Annual quota is required'],
      min: 0,
      default: 0
    },
    isUnpaid: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
