import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { dashboardApi, organizationApi, aiApi } from '../api/client';
import {
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
  Building2,
  Settings,
  Users,
  DollarSign,
  TrendingDown,
  Clock,
  Activity,
  Filter,
  AlertCircle,
  Briefcase,
  PieChart as PieIcon,
  BarChart3,
  Sparkles
} from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Date filter state
  const [filterType, setFilterType] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dashboard analytics state
  const [dashboardData, setDashboardData] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

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

  const loadDashboard = async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await dashboardApi.getAdminDashboard(params);
      setDashboardData(res.data || res);
    } catch (err) {
      console.error('Failed to load Admin dashboard analytics:', err);
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

  const kpis = dashboardData?.kpis || {
    headcount: 0,
    payrollCost: 0,
    averageSalary: 0,
    attritionYTD: null,
    attritionAvailable: false,
    attritionReason: null
  };

  const headcountByDept = dashboardData?.headcountByDepartment || [];
  const payrollCostByDept = dashboardData?.payrollCostByDepartment || [];
  const genderDistribution = dashboardData?.genderDistribution || [];
  const tenureDistribution = dashboardData?.tenureDistribution || [];

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
        title="Executive Admin Dashboard"
        description="Comprehensive organizational governance, workforce demographics, and financial overhead."
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/settings')}
              icon={<Settings size={15} />}
            >
              Organization Settings
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/hr/employees')}
              icon={<Users size={15} />}
            >
              Workforce Directory
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
            <Filter size={14} /> Reporting Period:
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

      {/* KPI Cards (4 Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px'
        }}
      >
        {/* KPI 1: Total Headcount */}
        <div className="card" style={{ padding: '20px' }}>
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
            Active employees
          </div>
        </div>

        {/* KPI 2: Payroll Cost */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              Payroll Cost
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <DollarSign size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="100px" height="28px" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#059669' }}>
              {kpis.payrollCost > 0 ? formatCurrency(kpis.payrollCost) : '$0'}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            {kpis.payrollCost > 0 ? 'Finalized net payroll' : 'No finalized payroll yet'}
          </div>
        </div>

        {/* KPI 3: Average Salary */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              Average Salary
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <Briefcase size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="90px" height="28px" />
          ) : (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#7c3aed' }}>
              {kpis.averageSalary > 0 ? formatCurrency(kpis.averageSalary) : '$0'}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            Active base compensation
          </div>
        </div>

        {/* KPI 4: Attrition YTD */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
              Attrition YTD
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <TrendingDown size={17} />
            </div>
          </div>
          {dashLoading ? (
            <Skeleton width="80px" height="28px" />
          ) : kpis.attritionAvailable && kpis.attritionYTD !== null ? (
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#ea580c' }}>
              {kpis.attritionYTD}%
            </div>
          ) : (
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-400)', marginTop: '6px' }}>
              Data unavailable
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--neutral-400)', marginTop: '4px' }}>
            {kpis.attritionReason || 'Year-to-date turnover'}
          </div>
        </div>
      </div>

      {/* Main Charts: Headcount by Department & Payroll Cost by Department */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        {/* Headcount by Department */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--primary-600)" />
                Headcount by Department
              </CardTitle>
              <CardDescription>
                Distribution of active personnel across departments
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="240px" />
            ) : headcountByDept.length === 0 ? (
              <EmptyState
                icon={<Users size={24} color="var(--neutral-400)" />}
                title="No department personnel"
                description="Assign employees to departments to see workforce distribution."
              />
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={headcountByDept} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" name="Employees" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Cost by Department */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} color="var(--success-600, #059669)" />
                Payroll Cost by Department
              </CardTitle>
              <CardDescription>
                Finalized payroll disbursements per organizational unit
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="240px" />
            ) : payrollCostByDept.length === 0 ? (
              <EmptyState
                icon={<DollarSign size={24} color="var(--neutral-400)" />}
                title="No finalized payroll data available"
                description="Payroll overhead will appear here once monthly payroll runs are finalized."
              />
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payrollCostByDept} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(val) => [formatCurrency(val), 'Net Payroll']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="total" name="Payroll Total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demographics & Tenure: Gender Distribution & Tenure Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieIcon size={18} color="var(--primary-600)" />
                Gender Demographics
              </CardTitle>
              <CardDescription>
                Workforce composition by registered gender
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="220px" />
            ) : genderDistribution.length === 0 ? (
              <EmptyState
                icon={<Users size={24} color="var(--neutral-400)" />}
                title="No gender demographic data recorded"
                description="Gender details are optional or have not been submitted for active employees."
              />
            ) : (
              <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderDistribution}
                      dataKey="count"
                      nameKey="gender"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {genderDistribution.map((entry, index) => (
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

        {/* Tenure Analytics */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary-600)" />
                Tenure Distribution
              </CardTitle>
              <CardDescription>
                Workforce experience distribution calculated from joining dates
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashLoading ? (
              <Skeleton width="100%" height="220px" />
            ) : tenureDistribution.every((t) => t.count === 0) ? (
              <EmptyState
                icon={<Clock size={24} color="var(--neutral-400)" />}
                title="No tenure data available"
                description="Employee joining dates are required to calculate tenure distributions."
              />
            ) : (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tenureDistribution} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" name="Employees" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                  Grounded executive analysis of headcount, payroll overhead, and organizational performance
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
                Click "Summarize" to generate real-time executive insights.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-400)', maxWidth: '420px' }}>
                The assistant will examine total active headcount, payroll disbursements, and department allocations to produce grounded observations.
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

      {/* Recent Activity / Audit Feed Placeholder */}
      <Card style={{ border: '1px dashed var(--neutral-300)', backgroundColor: '#fafafa' }}>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'var(--neutral-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--neutral-700)'
                }}
              >
                <Activity size={16} />
              </div>
              <div>
                <CardTitle style={{ fontSize: '15px' }}>Recent Activity & System Audit</CardTitle>
                <CardDescription>
                  Traceability log of administrative operations, policy changes, and payroll approvals
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" style={{ fontSize: '11px' }}>
              Audit Stream Prepared
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--neutral-600)' }}>
              Audit activity will appear here.
            </div>
            <div style={{ fontSize: '12px', color: 'var(--neutral-400)', maxWidth: '420px' }}>
              Full audit logs with user identities, timestamps, and entity mutations will automatically stream here upon activation of the audit service.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
