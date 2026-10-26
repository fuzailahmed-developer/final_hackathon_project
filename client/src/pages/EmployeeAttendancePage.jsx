import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { attendanceApi } from '../api/client';
import {
  formatDate,
  formatTime,
  formatDuration,
  getStatusBadgeConfig
} from '../utils/dateUtils';
import {
  Clock,
  Calendar,
  Filter,
  Info,
  CheckCircle,
  AlertTriangle,
  History
} from 'lucide-react';

export const EmployeeAttendancePage = () => {
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getMyHistory({ startDate, endDate });
      setRecords(res.data || []);
    } catch (err) {
      toast.error('Failed to load your attendance history');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      <PageHeader
        title="My Attendance History"
        description="View your personal shift records, working durations, and attendance status logs."
      />

      {/* Security / HR contact notice */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'var(--primary-50)',
        border: '1px solid var(--primary-100)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px',
        fontSize: '13px',
        color: 'var(--primary-800)'
      }}>
        <Info size={16} color="var(--primary-600)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Attendance Adjustment Policy:</strong> Personal attendance logs cannot be edited directly by employees. If you noticed an anomaly or missed a checkout, contact your HR Manager to request a manual correction.
        </span>
      </div>

      {/* Date Filter Bar */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-600)', fontWeight: 500 }}>
              Date Range:
            </span>
            <input
              type="date"
              className="select-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '150px' }}
            />
            <span style={{ color: 'var(--neutral-400)' }}>to</span>
            <input
              type="date"
              className="select-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '150px' }}
            />
          </div>

          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              Reset Range
            </Button>
          )}
        </div>
      </Card>

      {/* Table Content */}
      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px' }}>
              <Skeleton height="36px" style={{ marginBottom: '12px' }} />
              <Skeleton height="36px" style={{ marginBottom: '12px' }} />
              <Skeleton height="36px" />
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: '40px 24px' }}>
              <EmptyState
                icon={<History size={28} color="var(--primary-600)" />}
                title="No attendance records yet"
                description={
                  startDate || endDate
                    ? 'No attendance was recorded within the selected date range.'
                    : 'Your attendance history will appear here after you check in for your daily shifts.'
                }
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
                    <th>Worked Duration</th>
                    <th>Status</th>
                    <th>Adjustment Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const statusConfig = getStatusBadgeConfig(rec.status);
                    const isWorking = !rec.checkOut && rec.date === todayStr;

                    return (
                      <tr key={rec._id}>
                        {/* Date */}
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} color="var(--primary-600)" />
                            {formatDate(rec.date)}
                          </span>
                        </td>

                        {/* Check In */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                              {formatTime(rec.checkIn)}
                            </span>
                            {rec.lateMinutes > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--warning-700)', fontWeight: 500 }}>
                                Late by {rec.lateMinutes}m
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Check Out */}
                        <td>
                          {rec.checkOut ? (
                            <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                              {formatTime(rec.checkOut)}
                            </span>
                          ) : isWorking ? (
                            <span style={{ fontSize: '12px', color: 'var(--primary-600)', fontWeight: 500 }}>
                              In Progress (Working)
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--danger-600)', fontWeight: 500 }}>
                              Missing Checkout
                            </span>
                          )}
                        </td>

                        {/* Worked Duration */}
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>
                            {formatDuration(rec.workedMinutes)}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <Badge variant={statusConfig.variant} withDot>
                            {statusConfig.label}
                          </Badge>
                        </td>

                        {/* Correction details */}
                        <td>
                          {rec.correctionReason ? (
                            <span style={{ fontSize: '12px', color: 'var(--primary-700)' }}>
                              {rec.correctionReason}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--neutral-400)' }}>—</span>
                          )}
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
    </div>
  );
};

export default EmployeeAttendancePage;
