const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'hr', 'employee'],
      required: true
    },
    requestType: {
      type: String,
      enum: ['chat', 'smart_leave', 'dashboard_summary'],
      required: true
    },
    message: {
      type: String,
      default: ''
    },
    toolsUsed: {
      type: [String],
      default: []
    },
    success: {
      type: Boolean,
      default: true
    },
    responseTimeMs: {
      type: Number,
      default: 0
    },
    error: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AiLog', aiLogSchema);
