const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorName: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: ''
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    entity: {
      type: String,
      required: true,
      trim: true
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Admin-only index for filtering common patterns
auditLogSchema.index({ entity: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
