const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'leave_submitted',
        'leave_approved',
        'leave_rejected',
        'announcement_published',
        'payroll_finalized',
        'general'
      ],
      required: true
    },
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
      maxlength: 1000
    },
    relatedEntity: {
      type: String,
      default: null
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// Compound index for efficiently querying a user's unread notifications
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
