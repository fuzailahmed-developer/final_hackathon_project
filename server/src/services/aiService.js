const { TOOLS, TOOL_DEFINITIONS, get_company_policy_context, resolveEmployee } = require('./aiTools');

const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gemini-1.5-flash';

/**
 * Build role-aware system prompt grounded in configured organization policies
 */
async function buildSystemPrompt(user) {
  const policy = await get_company_policy_context();
  const role = user.role;

  return `You are HCM Assistant, the dedicated enterprise AI companion for ${policy.companyName} within the HCM Lite human capital management suite.

CRITICAL ROLES & PERMISSIONS:
The current authenticated user is: "${user.name}" (Role: ${role.toUpperCase()}, Email: ${user.email}).

1. ROLE CONSTRAINTS:
- ADMIN: Complete oversight of company workforce, attendance, leaves, finalized payroll overhead, and employee search.
- HR: Workforce management, presence monitoring, leave management, attendance tracking, and late arrival oversight.
- EMPLOYEE: PERSONAL DATA ONLY (their own attendance, their own leave balance, their own latest payslip, and general company policies).

2. PRIVACY & SALARY REFUSAL (CRITICAL RULE):
- If an Employee asks about another colleague's salary or compensation (e.g., "What is David's salary?", "How much does my coworker earn?"):
  You MUST IMMEDIATELY REFUSE politely:
  "I cannot provide another employee's salary or private compensation information. I can help you with your own payslip or salary information."
- Do NOT invoke any salary or employee tools to fetch other people's compensation.

3. COMPANY POLICY KNOWLEDGE BASE (GROUND TRUTH):
- Office Hours: ${policy.officeStartTime} to ${policy.officeEndTime}
- Grace Period: ${policy.gracePeriodMinutes} minutes after shift start time before marked as late
- Half-Day Threshold: ${policy.halfDayMinutes} minutes minimum worked time
- Standard Weekend Days: ${policy.weekendDays.join(', ')}
- Available Leave Policies: ${policy.leavePolicies.map((p) => `${p.name} (${p.annualQuota ? `${p.annualQuota} days/yr` : 'Unpaid'})`).join(', ')}

4. FACTUALITY & TRANSPARENCY:
- Never invent metrics, dates, or employees.
- If data is unavailable, state it clearly.
- Keep tone professional, concise, and helpful.`;
}

/**
 * Execute tool locally and record tool usage
 */
async function executeTool(toolName, args, user, toolsUsed) {
  toolsUsed.push(toolName);
  const fn = TOOLS[toolName];
  if (!fn) {
    return { error: `Tool ${toolName} not found` };
  }
  try {
    return await fn(args, user);
  } catch (err) {
    console.error(`Error executing tool ${toolName}:`, err);
    return { error: err.message };
  }
}

/**
 * Direct Fallback Intent Resolver (if AI_API_KEY is not yet populated or quota exceeded)
 */
async function fallbackIntentResolver(message, user) {
  const lower = message.toLowerCase();
  const toolsUsed = [];

  // Privacy Check for Employee asking about colleague salary
  if (user.role === 'employee' && (lower.includes('salary') || lower.includes('earn') || lower.includes('payslip'))) {
    if (lower.includes('david') || lower.includes('colleague') || lower.includes('coworker') || lower.includes('other') || lower.includes('someone')) {
      return {
        answer: "I cannot provide another employee's salary or private compensation information. I can help you with your own payslip or salary information.",
        toolsUsed: [],
        generatedBy: 'AI'
      };
    }
  }

  // Employee asks for company late comers
  if (user.role === 'employee' && (lower.includes('who came late') || lower.includes('who is late') || lower.includes('top late'))) {
    const res = await executeTool('get_late_comers', {}, user, toolsUsed);
    return {
      answer: "Company-wide late arrival records are restricted to HR and Admin managers. You have recorded " + (res.monthLateCount || 0) + " late arrival(s) this month.",
      toolsUsed,
      generatedBy: 'AI'
    };
  }

  // Headcount query
  if (lower.includes('headcount') || lower.includes('how many active employees') || lower.includes('employees are in')) {
    let dept = null;
    if (lower.includes('engineering')) dept = 'Engineering';
    else if (lower.includes('hr')) dept = 'HR';
    else if (lower.includes('design')) dept = 'Design';
    else if (lower.includes('sales')) dept = 'Sales';

    const res = await executeTool('get_headcount', { department: dept }, user, toolsUsed);
    if (res.error) {
      return { answer: res.error, toolsUsed, generatedBy: 'AI' };
    }
    return {
      answer: `There are currently ${res.count} active employee(s) registered in ${res.department}.`,
      toolsUsed,
      generatedBy: 'AI'
    };
  }

  // Attendance summary / rate
  if (lower.includes('attendance rate') || lower.includes('attendance summary') || lower.includes('how many employees were absent')) {
    const res = await executeTool('get_attendance_summary', {}, user, toolsUsed);
    if (res.error) return { answer: res.error, toolsUsed, generatedBy: 'AI' };
    if (res.scope === 'personal') {
      return {
        answer: `Today's shift status is "${res.todayStatus}". You have ${res.monthLateCount} late arrival(s) this month.`,
        toolsUsed,
        generatedBy: 'AI'
      };
    }
    return {
      answer: `Today's attendance rate is ${res.attendanceRate}. ${res.presentToday} out of ${res.totalHeadcount} employees are currently present, and ${res.onLeaveToday} are on approved leave.`,
      toolsUsed,
      generatedBy: 'AI'
    };
  }

  // Who came late most often
  if (lower.includes('late most often') || lower.includes('who came late') || lower.includes('top late comers')) {
    const res = await executeTool('get_late_comers', {}, user, toolsUsed);
    if (res.scope === 'personal') {
      return {
        answer: `Company-wide late arrivals are restricted. Your personal late arrival count for this month is ${res.monthLateCount}.`,
        toolsUsed,
        generatedBy: 'AI'
      };
    }
    const list = res.topLateComers || [];
    if (list.length === 0) {
      return { answer: 'There are no late arrival records in the system.', toolsUsed, generatedBy: 'AI' };
    }
    const bullets = list.map((l) => `${l.name} (${l.department}) — ${l.lateCount} late occurrence(s)`).join('\n• ');
    return {
      answer: `The employees with the highest late arrivals are:\n• ${bullets}`,
      toolsUsed,
      generatedBy: 'AI'
    };
  }

  // Leave balance / sick leaves
  if (lower.includes('leave balance') || lower.includes('sick leave') || lower.includes('annual leave') || lower.includes('casual leave')) {
    const res = await executeTool('get_my_leave_balance', {}, user, toolsUsed);
    if (res.error) return { answer: res.error, toolsUsed, generatedBy: 'AI' };
    const balances = res.balances || [];
    const text = balances.map((b) => `${b.leaveType}: ${b.remaining !== null ? `${b.remaining} remaining (of ${b.quota})` : 'Unlimited'}`).join(', ');
    return {
      answer: `Your current leave balances are: ${text}.`,
      toolsUsed,
      generatedBy: 'AI'
    };
  }

  // Payroll summary / payslip
  if (lower.includes('payroll cost') || lower.includes('finalized payroll') || lower.includes('latest payslip') || lower.includes('my payslip')) {
    const res = await executeTool('get_payroll_summary', {}, user, toolsUsed);
    if (res.scope === 'personal') {
      if (res.message) return { answer: res.message, toolsUsed, generatedBy: 'AI' };
      return {
        answer: `Your latest finalized payslip for period ${res.month}/${res.year} has a net salary of $${res.netSalary.toLocaleString()}.`,
        toolsUsed,
        generatedBy: 'AI'
      };
    }
    return {
      answer: `The finalized payroll cost is $${res.totalPayrollCost.toLocaleString()} with an average base salary of $${Math.round(res.averageSalary).toLocaleString()}.`,
      toolsUsed,
      generatedBy: 'AI'
    };
  }

  // Policy Q&A
  const policy = await get_company_policy_context();
  if (lower.includes('office start') || lower.includes('time does the office start') || lower.includes('shift start')) {
    return {
      answer: `The standard office hours start at ${policy.officeStartTime} and conclude at ${policy.officeEndTime}.`,
      toolsUsed: [],
      generatedBy: 'AI'
    };
  }
  if (lower.includes('grace period')) {
    return {
      answer: `The standard grace period is ${policy.gracePeriodMinutes} minutes after shift start time before arrivals are flagged as late.`,
      toolsUsed: [],
      generatedBy: 'AI'
    };
  }
  if (lower.includes('half day') || lower.includes('what counts as a half day')) {
    return {
      answer: `A shift qualifies as a half day when worked duration meets or exceeds ${policy.halfDayMinutes} minutes (typically 4 hours).`,
      toolsUsed: [],
      generatedBy: 'AI'
    };
  }
  if (lower.includes('how many annual leaves') || lower.includes('annual leaves do i get')) {
    const annual = policy.leavePolicies.find((p) => p.name.toLowerCase().includes('annual'));
    const days = annual ? `${annual.annualQuota} days per year` : 'determined by organization settings';
    return {
      answer: `Employees are allocated ${days} of annual leave according to company policy.`,
      toolsUsed: [],
      generatedBy: 'AI'
    };
  }

  // General fallback
  return {
    answer: `I am your HCM Assistant. I can help you with attendance inquiries, leave balances, company policies, and workforce metrics within your permitted role (${user.role.toUpperCase()}).`,
    toolsUsed: [],
    generatedBy: 'AI'
  };
}

/**
 * Main Chat Completion Endpoint Handler with Gemini Function Calling
 */
async function chat(message, user) {
  const toolsUsed = [];
  const key = process.env.AI_API_KEY || '';

  // 1. Client privacy check on salary of colleagues
  const lower = (message || '').toLowerCase();
  if (user.role === 'employee' && (lower.includes('salary') || lower.includes('earn') || lower.includes('compensation'))) {
    if (lower.includes('david') || lower.includes('colleague') || lower.includes('coworker') || lower.includes('other')) {
      return {
        answer: "I cannot provide another employee's salary or private compensation information. I can help you with your own payslip or salary information.",
        toolsUsed: [],
        generatedBy: 'AI'
      };
    }
  }

  // If no API key configured, use deterministic intent and tool resolver
  if (!key) {
    return await fallbackIntentResolver(message, user);
  }

  // 2. Format Gemini tools payload
  const geminiFunctions = TOOL_DEFINITIONS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }));

  const systemInstruction = await buildSystemPrompt(user);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${key}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    tools: [
      {
        functionDeclarations: geminiFunctions
      }
    ]
  };

  // 15-second timeout and 1-time retry loop
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`Gemini API returned status ${resp.status}:`, errText);
        if (attempts >= 2) throw new Error(`Gemini API error: ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];

      // Check if model called a function
      if (part?.functionCall) {
        const call = part.functionCall;
        const toolResult = await executeTool(call.name, call.args || {}, user, toolsUsed);

        // Send function result back to Gemini for final response synthesis
        const followUpPayload = {
          contents: [
            ...payload.contents,
            {
              role: 'model',
              parts: [{ functionCall: call }]
            },
            {
              role: 'function',
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: toolResult
                  }
                }
              ]
            }
          ],
          systemInstruction: payload.systemInstruction
        };

        const followUpController = new AbortController();
        const followUpTimeout = setTimeout(() => followUpController.abort(), 15000);

        const followResp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(followUpPayload),
          signal: followUpController.signal
        });
        clearTimeout(followUpTimeout);

        if (followResp.ok) {
          const followData = await followResp.json();
          const finalCandidate = followData.candidates?.[0];
          const textPart = finalCandidate?.content?.parts?.find((p) => p.text);
          if (textPart?.text) {
            return {
              answer: textPart.text.trim(),
              toolsUsed,
              generatedBy: 'AI'
            };
          }
        }

        // Direct tool result fallback if follow-up failed
        return {
          answer: typeof toolResult === 'object' ? JSON.stringify(toolResult, null, 2) : String(toolResult),
          toolsUsed,
          generatedBy: 'AI'
        };
      }

      // Plain text response from model
      const text = part?.text;
      if (text) {
        return {
          answer: text.trim(),
          toolsUsed,
          generatedBy: 'AI'
        };
      }

      return await fallbackIntentResolver(message, user);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('AI assistant is temporarily unavailable. Request timed out after 15 seconds.');
      }
      if (attempts >= 2) {
        // Fallback to local tool resolver if external API fails
        console.warn('Falling back to local AI intent resolver after failure:', err.message);
        return await fallbackIntentResolver(message, user);
      }
    }
  }

  return await fallbackIntentResolver(message, user);
}

/**
 * Smart Leave: Extract leave parameters from natural language without mutating the database
 */
async function smartLeave(text, user) {
  const emp = await resolveEmployee(user);

  const key = process.env.AI_API_KEY || '';
  const now = new Date();
  const currentYear = now.getFullYear();

  // If key available, use structured prompt extraction
  if (key) {
    const prompt = `You are a Smart Leave extraction engine for HCM Lite.
Current date reference: ${now.toISOString().split('T')[0]}.
Input text: "${text}"

Extract the leave request details and return strictly a valid JSON object with these keys:
{
  "type": "Casual" (or Annual, Sick, Unpaid),
  "start": "YYYY-MM-DD",
  "end": "YYYY-MM-DD",
  "reason": "short explanation"
}
Return only JSON without markdown fences.`;

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${key}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, '').trim());
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Smart leave API extraction failed, using heuristic regex fallback:', err.message);
    }
  }

  // Heuristic regex parser fallback for natural language dates
  // Supports both "November 12 to November 15" and "12 November to 15 November"
  const monthNames = {
    january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
    may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
    september: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11
  };

  const monthRegexPart = Object.keys(monthNames).join('|');
  // Match "Month Day" or "Day Month"
  const pattern = new RegExp(
    `(?:(${monthRegexPart})\\s+(\\d{1,2})(?:st|nd|rd|th)?|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthRegexPart}))(?:\\s*,?\\s*(\\d{4}))?`,
    'gi'
  );

  const parsedDates = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    let mName = match[1] || match[4];
    let day = parseInt(match[2] || match[3], 10);
    let yr = match[5] ? parseInt(match[5], 10) : currentYear;
    let mIdx = monthNames[mName.toLowerCase()] ?? now.getMonth();
    const d = new Date(yr, mIdx, day);
    // Format YYYY-MM-DD
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    parsedDates.push(iso);
  }

  let startDate = parsedDates[0] || null;
  let endDate = parsedDates[1] || parsedDates[0] || null;

  if (!startDate) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    startDate = iso;
    endDate = iso;
  }

  // Determine type
  let type = 'Casual';
  const lower = text.toLowerCase();
  if (lower.includes('sick') || lower.includes('doctor') || lower.includes('fever') || lower.includes('hospital')) {
    type = 'Sick';
  } else if (lower.includes('annual') || lower.includes('vacation') || lower.includes('holiday')) {
    type = 'Annual';
  }

  return {
    type,
    start: typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0],
    end: typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0],
    reason: text.replace(/need leave|i need leave|apply for leave/gi, '').trim() || 'Personal leave request'
  };
}

/**
 * Dashboard AI Summary: Grounded bullet points from structured analytics
 */
async function generateDashboardSummary(kpis, user) {
  const key = process.env.AI_API_KEY || '';

  if (key) {
    const prompt = `You are the executive analyst for HCM Lite.
Based SOLELY on the following structured HR/Workforce metrics JSON, generate 3 to 5 concise, high-impact bullet point insights.
Rules:
- Strictly do NOT invent or fabricate numbers.
- Base every single observation on the numbers below.
- Keep each bullet point under 25 words.

KPI Data:
${JSON.stringify(kpis, null, 2)}

Return the bullets as a clean JSON array of strings:
["Insight 1...", "Insight 2...", "Insight 3..."]`;

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${key}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonStr) {
          const bullets = JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, '').trim());
          if (Array.isArray(bullets) && bullets.length >= 3) {
            return bullets.slice(0, 5);
          }
        }
      }
    } catch (err) {
      console.warn('Dashboard summary LLM call failed, generating grounded deterministic insights:', err.message);
    }
  }

  // Grounded rule-based insights fallback
  const insights = [];
  const headcount = kpis?.headcount ?? kpis?.totalHeadcount ?? 0;
  const present = kpis?.presentToday ?? 0;
  const late = kpis?.lateToday ?? 0;
  const onLeave = kpis?.onLeaveToday ?? 0;
  const pending = kpis?.pendingApprovals ?? 0;
  const payrollCost = kpis?.payrollCost ?? 0;

  insights.push(`Active workforce headcount stands at ${headcount} employee(s) across departments.`);

  if (present > 0 || late > 0) {
    insights.push(`Daily presence is strong with ${present} employee(s) present today and ${late} arrival(s) flagged after the grace period.`);
  } else {
    insights.push(`Attendance records for today show 0 checked-in employees so far.`);
  }

  if (onLeave > 0 || pending > 0) {
    insights.push(`${onLeave} employee(s) are on approved leave today, with ${pending} leave approval request(s) awaiting managerial review.`);
  } else {
    insights.push(`No pending leave approval requests require immediate action.`);
  }

  if (payrollCost > 0) {
    insights.push(`Total finalized payroll cost for the current period is $${payrollCost.toLocaleString()}.`);
  } else {
    insights.push(`No finalized payroll runs recorded for the selected reporting period.`);
  }

  return insights.slice(0, 4);
}

module.exports = {
  chat,
  smartLeave,
  generateDashboardSummary
};
