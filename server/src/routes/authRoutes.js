const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    // Generic safe error message to prevent account enumeration
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const secret = process.env.JWT_SECRET || 'hcm_lite_jwt_secure_dev_secret_key_987654321';
    const payload = {
      userId: user._id,
      role: user.role
    };

    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    // Set secure HTTP-only cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    // Prepare safe user object (exclude password)
    const userJson = user.toJSON();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userJson,
        token
      }
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again later.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Current user profile retrieved',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('[Get Me Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user session'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Clear auth cookie and terminate session
 * @access  Public / Private
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
