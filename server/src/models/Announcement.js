const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    audience: {
      type: String,
      enum: ['all', 'hr', 'employees', 'department'],
      required: true,
      default: 'all'
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
