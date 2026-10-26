const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    // Standardized date string 'YYYY-MM-DD' representing the attendance day
    date: {
      type: String,
      required: [true, 'Attendance date string (YYYY-MM-DD) is required'],
      trim: true
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in timestamp is required']
    },
    checkOut: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'missing_checkout', 'corrected'],
      default: 'present'
    },
    workedMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    lateMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    correctionReason: {
      type: String,
      trim: true,
      default: ''
    },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    correctedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// STRICT CRITICAL CONSTRAINT: Exactly one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Secondary indexes for filtering performance
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
