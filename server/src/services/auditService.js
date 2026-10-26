const AuditLog = require('../models/AuditLog');

/**
 * Create an immutable audit log record.
 * Never throws — audit failures must not break the main request flow.
 *
 * @param {Object} opts
 * @param {Object}   opts.actor     - req.user (User document)
 * @param {string}   opts.action    - e.g. 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', etc.
 * @param {string}   opts.entity    - e.g. 'Employee', 'LeaveRequest', 'Payroll', etc.
 * @param {*}        [opts.entityId]
 * @param {*}        [opts.before]  - document snapshot before change
 * @param {*}        [opts.after]   - document snapshot after change
 * @param {*}        [opts.metadata]
 */
async function createAuditLog({ actor, action, entity, entityId = null, before = null, after = null, metadata = null }) {
  try {
    if (!actor || !action || !entity) {
      console.warn('[AuditService] Skipping audit: missing required fields (actor, action, entity)');
      return;
    }

    await AuditLog.create({
      actor: actor._id || actor,
      actorName: actor.name || '',
      role: actor.role || '',
      action,
      entity,
      entityId: entityId || null,
      before,
      after,
      metadata
    });
  } catch (err) {
    // Audit failure must never crash the main request
    console.error('[AuditService] Failed to create audit record:', err.message);
  }
}

module.exports = { createAuditLog };
