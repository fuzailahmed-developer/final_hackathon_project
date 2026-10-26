// Rate limiter for AI requests: 20 requests per user per hour
const userRequestsMap = new Map();

// Cleanup expired request timestamps periodically (every 10 minutes)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [userId, timestamps] of userRequestsMap.entries()) {
    const valid = timestamps.filter((t) => t > oneHourAgo);
    if (valid.length === 0) {
      userRequestsMap.delete(userId);
    } else {
      userRequestsMap.set(userId, valid);
    }
  }
}, 10 * 60 * 1000);

const aiRateLimiter = (req, res, next) => {
  const userId = req.user?._id?.toString() || req.ip || 'anonymous';
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  const userTimestamps = userRequestsMap.get(userId) || [];
  const recentTimestamps = userTimestamps.filter((t) => t > oneHourAgo);

  const MAX_REQUESTS_PER_HOUR = 20;

  if (recentTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded: You have reached the maximum of 20 AI requests per hour. Please try again later.'
    });
  }

  recentTimestamps.push(now);
  userRequestsMap.set(userId, recentTimestamps);
  next();
};

module.exports = { aiRateLimiter };
