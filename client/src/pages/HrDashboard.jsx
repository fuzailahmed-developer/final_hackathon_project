import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { dashboardApi, leaveApi, aiApi } from '../api/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  CheckCircle2,
  CalendarCheck,
  Clock,
  FileText,
  AlertCircle,
  Building,
  Sparkles,
  TrendingUp,
  PieChart as PieIcon,
  Filter,
  Check,
  X
} from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const HrDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Date filter state
  const [filterType, setFilterType] = useState('month'); // 'today', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dashboard analytics state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // AI Summary State
  const [aiInsights, setAiInsights] = useState([]);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const handleGenerateSummary = async () => {
    setSummarizing(true);
    setSummaryError('');
    try {
      const res = await aiApi.dashboardSummary(dashboardData?.kpis);
      setAiInsights(res.insights || []);
    } catch (err) {
      setSummaryError(err.message || 'Failed to generate AI summary.');
    } finally {
      setSummarizing(false);
    }
  };

  // Compute dates based on filter selection
  const handleFilterPreset = (preset) => {
    setFilterType(preset);
    const now = new Date();
    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(monthStart.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    handleFilterPreset('month');
  }, []);

  // Fetch dashboard data
  const loadDashboard = async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await dashboardApi.getHrDashboard(params);
      setDashboardData(res.data || res);
    } catch (err) {
      console.error('Failed to load HR dashboard analytics:', err);
      setDashError(err.message || 'Error loading analytics');
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Handle leave approval / rejection directly from dashboard
  const handleLeaveAction = async (leaveId, status) => {
    setActionLoadingId(leaveId);
    try {
      await leaveApi.updateStatus(leaveId, { status });
      // Refresh analytics
      await loadDashboard();
    } catch (err) {
      alert(`Failed to ${status} leave: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const kpis = dashboardData?.kpis || {
    headcount: 0,
    presentToday: 0,
    onLeaveToday: 0,
    lateToday: 0,
    pendingApprovals: 0
  };

  const attendanceTrend = dashboardData?.attendanceTrend || [];
  const absenteeismByDept = dashboardData?.absenteeismByDepartment || [];
  const leaveByType = dashboardData?.leaveByType || [];
  const topLateComers = dashboardData?.topLateComers || [];
  const pendingLeaves = dashboardData?.pendingLeaves || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="HR Dashboard & Operations"
        description="Monitor workforce presence, attendance trends, leaves, and approvals in real time."
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/hr/attendance')}
              icon={<Clock size={15} />}
            >
              Attendance Board
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/hr/employees')}
              icon={<Users size={15} />}
            >
              Directory
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/hr/employees/new')}
              icon={<UserPlus size={15} />}
            >
              Add Employee
            </Button>
          </div>
        }
      />

      {/* Date Filter Bar */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--card-bg, #ffffff)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Filter size={14} /> Filter Period:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['today', 'week', 'month', 'custom'].map((t) => (
              <Button
                key={t}
                size="xs"
                variant={filterType === t ? 'primary' : 'outline'}
                onClick={() => (t === 'custom' ? setFilterType('custom') : handleFilterPreset(t))}
                style={{ textTransform: 'capitalize', padding: '4px 10px', fontSize: '12px' }}
              >
                {t === 'today' ? 'Today' : t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : 'Custom'}
              </Button>
            ))}
          </div>
        </div>

        {filterType === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ fontSize: '12px', padding: '4px 8px', height: '32px' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>to</span>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ fontSize: '12px', padding: '4px 8px', height: '32px' }}
            />
            <Button size="xs" variant="primary" onClick={loadDashboard}>
              Apply
            </Button>
          </div>
        )}
      </div>

      {dashError && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: 'var(--radius-md)',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{dashError}</span>
          </div>
          <Button size="xs" variant="outline" onClick={loadDashboard}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards Row (5 Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}
      >
        {/* KPI 1: Total Headcount */}
        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              Total Headcount
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Users size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="60px" height="28px" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--neutral-900)' }}>
              {kpis.headcount}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            Active employment records
          </div>
        </div>

        {/* KPI 2: Present Today */}
        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              Present Today
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <CheckCircle2 size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="60px" height="28px" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669' }}>
              {kpis.presentToday}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            Checked in today
          </div>
        </div>

        {/* KPI 3: On Leave Today */}
        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              On Leave Today
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <CalendarCheck size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="60px" height="28px" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#7c3aed' }}>
              {kpis.onLeaveToday}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            Approved leave requests
          </div>
        </div>

        {/* KPI 4: Late Today */}
        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              Late Today
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Clock size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="60px" height="28px" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#d97706' }}>
              {kpis.lateToday}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            After grace period
          </div>
        </div>

        {/* KPI 5: Pending Approvals */}
        <div className="card" style={{ padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              Pending Approvals
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
              <FileText size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="60px" height="28px" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#e11d48' }}>
              {kpis.pendingApprovals}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            Requires HR action
          </div>
        </div>
      </div>

      {/* Main Analytics Charts: Attendance Trend & Absenteeism */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        {/* Attendance Trend Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--primary-600)" />
                Attendance Trend
              </CardTitle>
              <CardDescription>
                Daily attendance metrics (Present, Late, Half Day, Missing Checkout)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="240px" />
            ) : attendanceTrend.length === 0 ? (
              <EmptyState
                icon={<Clock size={24} color="var(--neutral-400)" />}
                title="No attendance trend data"
                description="Attendance records in this date range will render here automatically."
              />
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="halfDay" name="Half Day" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="missingCheckout" name="Missing Checkout" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absenteeism by Department */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} color="var(--primary-600)" />
                Absenteeism by Department
              </CardTitle>
              <CardDescription>
                Missed checkouts and partial day absences by department
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="240px" />
            ) : absenteeismByDept.length === 0 ? (
              <EmptyState
                icon={<Building size={24} color="var(--neutral-400)" />}
                title="Zero department absenteeism"
                description="No unfulfilled attendance days recorded for any department in this range."
              />
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={absenteeismByDept} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="absentDays" name="Absent Days" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Leave By Type & Top 5 Late Comers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        {/* Leave by Type */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieIcon size={18} color="var(--primary-600)" />
                Approved Leave by Type
              </CardTitle>
              <CardDescription>
                Distribution of utilized leave quota in working days
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="220px" />
            ) : leaveByType.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck size={24} color="var(--neutral-400)" />}
                title="No approved leaves in range"
                description="Approved leave requests will display here grouped by policy type."
              />
            ) : (
              <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveByType}
                      dataKey="days"
                      nameKey="leaveType"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {leaveByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Late Comers */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="var(--warning-600, #d97706)" />
                Top 5 Late Occurrences
              </CardTitle>
              <CardDescription>
                Employees with the highest late arrival frequency
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="220px" />
            ) : topLateComers.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={24} color="var(--success-500, #10b981)" />}
                title="Punctuality 100%"
                description="No late arrivals recorded among staff members."
              />
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>ID</th>
                      <th>Department</th>
                      <th style={{ textAlign: 'center' }}>Late Count</th>
                      <th style={{ textAlign: 'right' }}>Total Late</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLateComers.map((emp, i) => (
                      <tr key={emp.employeeId || i}>
                        <td style={{ fontWeight: 600 }}>{emp.name}</td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                            {emp.employeeId}
                          </span>
                        </td>
                        <td>
                          <Badge variant="default">{emp.department}</Badge>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#fffbeb',
                              color: '#b45309',
                              fontWeight: 600
                            }}
                          >
                            {emp.lateCount}x
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--neutral-600)' }}>
                          {emp.totalLateMinutes ? `${emp.totalLateMinutes} mins` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Leave Approvals Section */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--primary-600)" />
                Pending Leave Approvals
              </CardTitle>
              <CardDescription>
                Awaiting managerial decision ({pendingLeaves.length} pending)
              </CardDescription>
            </div>
            {pendingLeaves.length > 0 && (
              <Badge variant="warning">{pendingLeaves.length} Action Required</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dashLoading ? (
            <Skeleton width="100%" height="160px" />
          ) : pendingLeaves.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={24} color="var(--success-500, #10b981)" />}
              title="All caught up!"
              description="No leave requests are currently pending approval."
            />
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th style={{ textAlign: 'center' }}>Days</th>
                    <th>Submitted</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLeaves.map((l) => (
                    <tr key={l._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.employeeName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--neutral-400)' }}>
                          {l.employeeId} • {l.department}
                        </div>
                      </td>
                      <td>
                        <Badge variant="primary">{l.leaveType}</Badge>
                      </td>
                      <td>{new Date(l.startDate).toLocaleDateString()}</td>
                      <td>{new Date(l.endDate).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{l.workingDays}d</td>
                      <td style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                        {new Date(l.submittedAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button
                            size="xs"
                            variant="primary"
                            icon={<Check size={13} />}
                            disabled={actionLoadingId === l._id}
                            onClick={() => handleLeaveAction(l._id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            icon={<X size={13} />}
                            disabled={actionLoadingId === l._id}
                            onClick={() => handleLeaveAction(l._id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Workforce Insights Section */}
      <Card style={{ border: '1px solid #e0e7ff', backgroundColor: '#f8fafc' }}>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <CardTitle style={{ fontSize: '15px' }}>AI Workforce Insights</CardTitle>
                <CardDescription>
                  Grounded executive analysis of presence, approvals, and workforce distribution
                </CardDescription>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} /> AI-generated
              </Badge>
              <Button
                size="xs"
                variant="primary"
                onClick={handleGenerateSummary}
                disabled={summarizing || dashLoading}
                icon={<Sparkles size={13} />}
              >
                {summarizing ? 'Analyzing Metrics...' : 'Summarize'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {summaryError && (
            <div style={{ fontSize: '13px', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
              {summaryError}
            </div>
          )}

          {aiInsights.length === 0 && !summarizing ? (
            <div
              style={{
                padding: '20px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--neutral-600)' }}>
                Click "Summarize" to generate real-time AI workforce insights.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-400)', maxWidth: '420px' }}>
                The assistant will examine current headcount, today's attendance, and pending leave requests to produce grounded observations.
              </div>
            </div>
          ) : summarizing ? (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Skeleton width="90%" height="16px" />
              <Skeleton width="85%" height="16px" />
              <Skeleton width="80%" height="16px" />
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--neutral-800)' }}>
              {aiInsights.map((bullet, idx) => (
                <li key={idx} style={{ lineHeight: '1.5' }}>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HrDashboard;
