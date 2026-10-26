const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    officeStartTime: {
      type: String,
      default: '09:00',
      trim: true
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
      min: 0
    },
    halfDayHours: {
      type: Number,
      default: 5,
      min: 1
    },
    officeLatitude: {
      type: Number,
      default: null
    },
    officeLongitude: {
      type: Number,
      default: null
    },
    officeRadiusMeters: {
      type: Number,
      default: 100,
      min: 10
    },
    weekendDays: {
      type: [String],
      default: ['Saturday', 'Sunday']
    },
    isConfigured: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Organization', organizationSchema);
