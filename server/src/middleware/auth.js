const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT authentication via cookie or Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization Bearer header fallback
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const secret = process.env.JWT_SECRET || 'hcm_lite_jwt_secure_dev_secret_key_987654321';
    let decoded;

    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.'
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact your administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server authentication error'
    });
  }
};

/**
 * Enforce role-based access control (RBAC)
 * @param  {...string} roles Allowed roles ('admin', 'hr', 'employee')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before role verification.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of: [${roles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorizeRoles
};
