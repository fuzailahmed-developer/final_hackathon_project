const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Create a notification for a single user.
 * Never throws — notification failures must not break the main request flow.
 */
async function notifyUser({ userId, type, title, message, relatedEntity = null, relatedEntityId = null }) {
  try {
    if (!userId || !type || !title || !message) {
      console.warn('[NotificationService] Skipping notification: missing required fields');
      return;
    }
    await Notification.create({ user: userId, type, title, message, relatedEntity, relatedEntityId });
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
  }
}

/**
 * Notify all users with the specified role(s).
 */
async function notifyByRole({ roles, type, title, message, relatedEntity = null, relatedEntityId = null }) {
  try {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id').lean();
    const docs = users.map((u) => ({
      user: u._id,
      type,
      title,
      message,
      relatedEntity: relatedEntity || null,
      relatedEntityId: relatedEntityId || null,
      isRead: false
    }));
    if (docs.length > 0) {
      await Notification.insertMany(docs, { ordered: false });
    }
  } catch (err) {
    console.error('[NotificationService] Failed to notify by role:', err.message);
  }
}

/**
 * Notify a list of specific user IDs.
 */
async function notifyUsers({ userIds, type, title, message, relatedEntity = null, relatedEntityId = null }) {
  try {
    if (!userIds || userIds.length === 0) return;
    const docs = userIds.map((uid) => ({
      user: uid,
      type,
      title,
      message,
      relatedEntity: relatedEntity || null,
      relatedEntityId: relatedEntityId || null,
      isRead: false
    }));
    await Notification.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error('[NotificationService] Failed to notify users:', err.message);
  }
}

module.exports = { notifyUser, notifyByRole, notifyUsers };
