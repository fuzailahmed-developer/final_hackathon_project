import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingButton } from '../components/ui/LoadingButton';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeeApi, attendanceApi, dashboardApi, aiApi, leaveApi } from '../api/client';
import {
  formatDate,
  formatTime,
  formatDuration,
  getStatusBadgeConfig
} from '../utils/dateUtils';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  FileText,
  DollarSign,
  Bell,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CalendarCheck
} from 'lucide-react';

export const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [employeeDashboardData, setEmployeeDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);

  // Smart Leave State
  const [smartLeaveInput, setSmartLeaveInput] = useState('');
  const [smartExtracting, setSmartExtracting] = useState(false);
  const [smartPreview, setSmartPreview] = useState(null);
  const [smartSubmitting, setSmartSubmitting] = useState(false);
  const [smartError, setSmartError] = useState('');

  const handleExtractSmartLeave = async () => {
    if (!smartLeaveInput.trim()) return;
    setSmartExtracting(true);
    setSmartError('');
    try {
      const res = await aiApi.smartLeave(smartLeaveInput.trim());
      setSmartPreview(res.data);
    } catch (err) {
      setSmartError(err.message || 'Failed to extract leave parameters.');
    } finally {
      setSmartExtracting(false);
    }
  };

  const handleConfirmSmartLeave = async () => {
    if (!smartPreview) return;
    setSmartSubmitting(true);
    try {
      await leaveApi.apply({
        leaveTypeId: smartPreview.leaveTypeId,
        startDate: smartPreview.startDate,
        endDate: smartPreview.endDate,
        reason: smartPreview.reason
      });
      toast.success('Leave request submitted successfully for manager approval.');
      setSmartPreview(null);
      setSmartLeaveInput('');
      await loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit leave request.');
    } finally {
      setSmartSubmitting(false);
    }
  };

  // Load employee profile, attendance, and analytics dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      const [empRes, todayRes, sumRes, histRes, dashRes] = await Promise.all([
        employeeApi.getMyProfile().catch(() => ({ data: null })),
        attendanceApi.getToday().catch(() => ({ data: null })),
        attendanceApi.getMySummary().catch(() => ({ data: null })),
        attendanceApi.getMyHistory().catch(() => ({ data: [] })),
        dashboardApi.getEmployeeDashboard().catch(() => ({ data: null }))
      ]);

      setEmployee(empRes.data);
      setTodayAttendance(todayRes.data);
      setSummary(sumRes.data);
      setRecentRecords((histRes.data || []).slice(0, 5));
      setEmployeeDashboardData(dashRes.data || dashRes);
    } catch (err) {
      console.error('Failed to load employee dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Employee Check-in
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkIn();
      toast.success(res.message || 'Checked in successfully');
      await loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Employee Check-out
  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceApi.checkOut();
      toast.success(res.message || 'Checked out successfully');
      await loadDashboardData();
    } catch (err) {
      toast.error(err.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Weekly hours calculation
  const weekWorkedFormatted =
    employeeDashboardData?.weeklyHours?.worked ||
    summary?.weekWorkedHoursFormatted ||
    '0h 00m';

  const weekMinutes =
    employeeDashboardData?.weeklyHours?.totalMinutes !== undefined
      ? employeeDashboardData.weeklyHours.totalMinutes
      : summary?.weekWorkedMinutes || 0;

  const targetMinutes = 40 * 60;
  const progressPercent = Math.min(100, Math.round((weekMinutes / targetMinutes) * 100));

  const statusBadge = todayAttendance
    ? getStatusBadgeConfig(todayAttendance.status)
    : null;

  const leaveBalances = employeeDashboardData?.leaveBalance || [];
  const lateCount =
    employeeDashboardData?.lateCount !== undefined
      ? employeeDashboardData.lateCount
      : summary?.lateDays || 0;
  const lastPayslip = employeeDashboardData?.lastPayslip || null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title={`Welcome back, ${employee?.firstName || user?.name || 'Employee'}`}
        description="Shift status, working hours, leave entitlements, and payroll breakdown."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employee/attendance')}
              icon={<History size={15} />}
            >
              Attendance History
            </Button>
          </div>
        }
      />

      {/* Top Section: Check-In/Out & Weekly Target Hours */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}
      >
        {/* CARD 1: Today's Shift Status & Check-In/Out */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--primary-600)" />
              <CardTitle>Today's Shift Attendance</CardTitle>
            </div>
            {todayAttendance && (
              <Badge variant={statusBadge.variant} withDot>
                {todayAttendance.checkOut ? statusBadge.label : 'Working (In Progress)'}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height="100px" />
            ) : !todayAttendance ? (
              // State 1: Not checked in yet
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--neutral-600)' }}>
                  You have not checked in for today's shift. Standard arrival is 09:00 AM.
                </div>

                <LoadingButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleCheckIn}
                  loading={actionLoading}
                  loadingText="Recording Check-in..."
                  icon={<LogIn size={18} />}
                >
                  Check In Now
                </LoadingButton>
              </div>
            ) : !todayAttendance.checkOut ? (
              // State 2: Checked in, shift in progress
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--primary-50)',
                    border: '1px solid var(--primary-100)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--primary-700)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Checked In At
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '2px' }}>
                      {formatTime(todayAttendance.checkIn)}
                    </div>
                    {todayAttendance.lateMinutes > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--warning-700)', fontWeight: 500, marginTop: '2px' }}>
                        Arrival was late by {todayAttendance.lateMinutes} mins
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--primary-700)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    Shift Active
                  </div>
                </div>

                <LoadingButton
                  variant="danger"
                  size="lg"
                  fullWidth
                  onClick={handleCheckOut}
                  loading={actionLoading}
                  loadingText="Recording Checkout..."
                  icon={<LogOut size={18} />}
                >
                  Check Out (End Shift)
                </LoadingButton>
              </div>
            ) : (
              // State 3: Completed today's shift
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--success-50)',
                    border: '1px solid var(--success-100)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <CheckCircle2 size={24} color="var(--success-600)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--success-700)', fontSize: '14px' }}>
                      Today's Attendance Completed
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--neutral-600)', marginTop: '2px' }}>
                      {formatTime(todayAttendance.checkIn)} — {formatTime(todayAttendance.checkOut)} ({formatDuration(todayAttendance.workedMinutes)})
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--neutral-500)', paddingTop: '4px' }}>
                  <span>Recorded Status: <strong style={{ color: 'var(--neutral-800)' }}>{statusBadge.label}</strong></span>
                  <span>Date: <strong style={{ color: 'var(--neutral-800)' }}>{formatDate(todayAttendance.date)}</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 2: Weekly Worked Hours Target */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--primary-600)" />
              <CardTitle>This Week's Hours</CardTitle>
            </div>
            <Badge variant="primary">Target: 40h</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height="100px" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neutral-900)' }}>
                    {weekWorkedFormatted}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    of 40h weekly standard ({progressPercent}%)
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--neutral-200)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      backgroundColor: progressPercent >= 100 ? 'var(--success-500)' : 'var(--primary-600)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width var(--transition-normal)'
                    }}
                  />
                </div>

                {/* Metrics Breakdown */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--neutral-100)',
                    textAlign: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Present Days
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-800)', marginTop: '2px' }}>
                      {summary?.presentDays || 0}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Month Late
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: lateCount > 0 ? 'var(--warning-700)' : 'var(--neutral-800)', marginTop: '2px' }}>
                      {lateCount}x
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Half Days
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-800)', marginTop: '2px' }}>
                      {summary?.halfDays || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Leave Balance Cards & Last Payslip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Leave Balances Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarCheck size={18} color="var(--primary-600)" />
              <CardTitle>Leave Balances</CardTitle>
            </div>
            <Badge variant="default">Current Year</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height="110px" />
            ) : leaveBalances.length === 0 ? (
              <EmptyState
                icon={<Calendar size={22} color="var(--neutral-400)" />}
                title="No leave quotas assigned"
                description="Your organization has not yet configured leave quotas."
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                {leaveBalances.map((lb, idx) => (
                  <div
                    key={lb.leaveType || idx}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--neutral-50, #f8fafc)',
                      border: '1px solid var(--neutral-200, #e2e8f0)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-700)' }}>
                      {lb.leaveType}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary-700)' }}>
                      {lb.remaining !== null ? `${lb.remaining}d` : 'Unlimited'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-400)' }}>
                      {lb.quota !== null ? `of ${lb.quota} days total` : 'Unpaid policy'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Payslip Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} color="var(--success-600, #059669)" />
              <CardTitle>Last Payslip</CardTitle>
            </div>
            {lastPayslip && (
              <Badge variant="success">Finalized</Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton height="110px" />
            ) : !lastPayslip ? (
              <EmptyState
                icon={<DollarSign size={24} color="var(--neutral-400)" />}
                title="No payslip available yet"
                description="Your monthly payslip statement will display here once payroll is finalized."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>
                      Period: {lastPayslip.month}/{lastPayslip.year}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: '#065f46', marginTop: '2px' }}>
                      {formatCurrency(lastPayslip.netSalary)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857' }}>
                      Net Disbursement
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPayslipModalOpen(true)}
                    icon={<FileText size={14} />}
                  >
                    View Payslip
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Placeholders: Announcements & Ask HCM Assistant */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Announcements Placeholder */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="var(--primary-600)" />
              <CardTitle>Announcements</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Bell size={24} color="var(--neutral-400)" />}
              title="No announcements yet"
              description="Company notices, holiday announcements, and memos will be published here."
            />
          </CardContent>
        </Card>

        {/* Ask HCM Assistant CTA */}
        <Card style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', border: '1px solid #bfdbfe' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <Sparkles size={15} />
              </div>
              <div>
                <CardTitle>Ask HCM Assistant</CardTitle>
                <CardDescription>Instant answers for leave policies, late arrivals & personal records</CardDescription>
              </div>
            </div>
            <Badge variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> AI-generated
            </Badge>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--neutral-600)', margin: 0 }}>
                Get help with leave eligibility, attendance regulations, and company guidelines directly from your personal assistant.
              </p>
              <div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/employee/ai-assistant')}
                  icon={<Sparkles size={14} />}
                >
                  Open AI Assistant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Leave Assistant Section */}
      <Card style={{ border: '1px solid #e0e7ff', background: '#faf5ff' }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <CardTitle>Smart Leave Assistant</CardTitle>
                <CardDescription>Describe your leave naturally and AI will extract the structured request for review</CardDescription>
              </div>
            </div>
            <Badge variant="default" style={{ background: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe' }}>
              AI-generated pre-fill
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="e.g. My sister's wedding is from 12 November to 15 November. I need leave."
                value={smartLeaveInput}
                onChange={(e) => setSmartLeaveInput(e.target.value)}
                style={{ flex: 1, minWidth: '260px', height: '40px', backgroundColor: '#ffffff' }}
              />
              <Button
                variant="primary"
                onClick={handleExtractSmartLeave}
                disabled={smartExtracting || !smartLeaveInput.trim()}
                icon={<Sparkles size={15} />}
                style={{ height: '40px' }}
              >
                {smartExtracting ? 'Analyzing...' : 'Generate Leave Request'}
              </Button>
            </div>

            {smartError && (
              <div style={{ fontSize: '13px', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px' }}>
                {smartError}
              </div>
            )}

            {/* Extracted Form Preview - Requires explicit user confirmation */}
            {smartPreview && (
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #c7d2fe',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-700)' }}>
                    Extracted Request Preview (Please review before submission)
                  </span>
                  <Badge variant="primary">{smartPreview.workingDays} Working Day(s)</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--neutral-400)', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Leave Type</span>
                    <strong style={{ color: 'var(--neutral-800)' }}>{smartPreview.leaveTypeName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--neutral-400)', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Start Date</span>
                    <strong style={{ color: 'var(--neutral-800)' }}>{smartPreview.startDate}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--neutral-400)', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>End Date</span>
                    <strong style={{ color: 'var(--neutral-800)' }}>{smartPreview.endDate}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--neutral-400)', fontSize: '11px', textTransform: 'uppercase', display: 'block' }}>Extracted Reason</span>
                    <strong style={{ color: 'var(--neutral-800)' }}>{smartPreview.reason}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--neutral-100)' }}>
                  <Button size="sm" variant="outline" onClick={() => setSmartPreview(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleConfirmSmartLeave}
                    disabled={smartSubmitting}
                    icon={<CheckCircle2 size={14} />}
                  >
                    {smartSubmitting ? 'Submitting...' : 'Review & Submit'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Attendance Logs Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Attendance History</CardTitle>
            <CardDescription>Your latest recorded shifts and presence logs</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employee/attendance')}
            icon={<ArrowRight size={14} />}
          >
            Full History
          </Button>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px' }}>
              <Skeleton height="36px" style={{ marginBottom: '12px' }} />
              <Skeleton height="36px" />
            </div>
          ) : recentRecords.length === 0 ? (
            <div style={{ padding: '32px 20px' }}>
              <EmptyState
                icon={<History size={26} color="var(--primary-600)" />}
                title="No past attendance records"
                description="Check in to begin tracking your attendance and working hours history."
              />
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map((r) => {
                    const st = getStatusBadgeConfig(r.status);
                    return (
                      <tr key={r._id}>
                        <td style={{ fontWeight: 600 }}>{formatDate(r.date)}</td>
                        <td>
                          {formatTime(r.checkIn)}
                          {r.lateMinutes > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--warning-700)', marginLeft: '6px' }}>
                              (+{r.lateMinutes}m)
                            </span>
                          )}
                        </td>
                        <td>{r.checkOut ? formatTime(r.checkOut) : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{formatDuration(r.workedMinutes)}</td>
                        <td>
                          <Badge variant={st.variant} withDot>
                            {st.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslip Modal */}
      {payslipModalOpen && lastPayslip && (
        <Modal
          isOpen={payslipModalOpen}
          onClose={() => setPayslipModalOpen(false)}
          title={`Payslip Statement: ${lastPayslip.month}/${lastPayslip.year}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '13px', color: 'var(--neutral-500)' }}>Employee Name</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>
                {employee?.firstName} {employee?.lastName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '2px' }}>
                ID: {employee?.employeeId} • {employee?.department?.name || 'Department'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--neutral-100)' }}>
              <span style={{ color: 'var(--neutral-600)' }}>Disbursement Month</span>
              <strong>{lastPayslip.month} / {lastPayslip.year}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--neutral-100)' }}>
              <span style={{ color: 'var(--neutral-600)' }}>Disbursement Status</span>
              <Badge variant="success">Finalized</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 700, color: '#065f46' }}>
              <span>Net Salary</span>
              <span>{formatCurrency(lastPayslip.netSalary)}</span>
            </div>

            <Button variant="primary" fullWidth onClick={() => setPayslipModalOpen(false)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeDashboard;
