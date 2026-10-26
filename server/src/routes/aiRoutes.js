const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/aiRateLimiter');
const aiService = require('../services/aiService');
const analyticsService = require('../services/analyticsService');
const LeaveType = require('../models/LeaveType');
const { calculateWorkingDays } = require('../services/leaveService');
const AiLog = require('../models/AiLog');

/**
 * POST /api/ai/chat
 * Primary enterprise conversational AI endpoint
 */
router.post('/chat', authenticate, aiRateLimiter, async (req, res) => {
  const startTime = Date.now();
  const { message } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message string is required' });
  }

  let toolsUsed = [];
  try {
    const result = await aiService.chat(message.trim(), req.user);
    toolsUsed = result.toolsUsed || [];

    // Audit Log asynchronously
    AiLog.create({
      user: req.user._id,
      role: req.user.role,
      requestType: 'chat',
      message: message.trim().slice(0, 500),
      toolsUsed,
      success: true,
      responseTimeMs: Date.now() - startTime
    }).catch((err) => console.error('AiLog write error:', err.message));

    return res.json({
      success: true,
      answer: result.answer,
      generatedBy: 'AI',
      toolsUsed
    });
  } catch (err) {
    console.error('AI Chat Error:', err);
    AiLog.create({
      user: req.user._id,
      role: req.user.role,
      requestType: 'chat',
      message: message.trim().slice(0, 500),
      toolsUsed,
      success: false,
      responseTimeMs: Date.now() - startTime,
      error: err.message
    }).catch(() => {});

    return res.status(500).json({
      success: false,
      message: err.message || 'AI assistant is temporarily unavailable. Please try again.'
    });
  }
});

/**
 * POST /api/ai/smart-leave
 * Natural language leave request parameter extraction and business validation
 */
router.post('/smart-leave', authenticate, aiRateLimiter, async (req, res) => {
  const startTime = Date.now();
  const { text } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, message: 'Description text is required' });
  }

  try {
    const extracted = await aiService.smartLeave(text.trim(), req.user);

    // Business validation: Match with active LeaveType
    const leaveTypes = await LeaveType.find({ isActive: true });
    let matchedType = leaveTypes.find(
      (lt) => lt.name.toLowerCase() === (extracted.type || '').toLowerCase()
    );
    if (!matchedType) {
      matchedType = leaveTypes[0] || null;
    }

    // Business validation: Working days calculation
    let workingDays = 1;
    if (extracted.start && extracted.end) {
      const s = new Date(extracted.start);
      const e = new Date(extracted.end);
      if (e >= s) {
        workingDays = await calculateWorkingDays(s, e);
      }
    }

    AiLog.create({
      user: req.user._id,
      role: req.user.role,
      requestType: 'smart_leave',
      message: text.trim().slice(0, 500),
      toolsUsed: ['smart_leave_extract'],
      success: true,
      responseTimeMs: Date.now() - startTime
    }).catch(() => {});

    return res.json({
      success: true,
      generatedBy: 'AI',
      data: {
        leaveTypeId: matchedType?._id || '',
        leaveTypeName: matchedType?.name || extracted.type || 'Casual',
        startDate: extracted.start,
        endDate: extracted.end,
        reason: extracted.reason || text.trim(),
        workingDays
      }
    });
  } catch (err) {
    console.error('Smart Leave Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to process Smart Leave request.'
    });
  }
});

/**
 * POST /api/ai/dashboard-summary
 * Generates 3-5 grounded insights from real analytics data
 */
router.post('/dashboard-summary', authenticate, aiRateLimiter, async (req, res) => {
  const startTime = Date.now();

  try {
    let kpiData = req.body?.kpis;

    // If client didn't supply KPIs, fetch fresh from analyticsService
    if (!kpiData) {
      if (req.user.role === 'admin') {
        const adminData = await analyticsService.getAdminDashboard({});
        kpiData = adminData.kpis;
      } else {
        const hrData = await analyticsService.getHrDashboard({});
        kpiData = hrData.kpis;
      }
    }

    const insights = await aiService.generateDashboardSummary(kpiData, req.user);

    AiLog.create({
      user: req.user._id,
      role: req.user.role,
      requestType: 'dashboard_summary',
      message: 'Dashboard Summary Triggered',
      toolsUsed: ['analytics_summary'],
      success: true,
      responseTimeMs: Date.now() - startTime
    }).catch(() => {});

    return res.json({
      success: true,
      generatedBy: 'AI',
      insights
    });
  } catch (err) {
    console.error('Dashboard Summary Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate dashboard summary.'
    });
  }
});

module.exports = router;
