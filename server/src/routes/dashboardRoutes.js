const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

// Admin Dashboard – admin only
router.get('/admin', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getAdminDashboard({ startDate, endDate });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// HR Dashboard – admin or HR roles
router.get('/hr', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getHrDashboard({ startDate, endDate });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Employee Dashboard – employee role only, employee resolved from authenticated user context
router.get('/employee', authenticate, authorizeRoles('employee'), async (req, res) => {
  try {
    const data = await analyticsService.getEmployeeDashboard(req.user);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    if (err.message === 'Employee not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
