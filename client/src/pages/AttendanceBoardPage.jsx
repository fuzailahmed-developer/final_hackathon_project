import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingButton } from '../components/ui/LoadingButton';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { attendanceApi, departmentApi } from '../api/client';
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
  Search,
  X,
  Edit2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Users,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const AttendanceBoardPage = () => {
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, late: 0, halfDay: 0, missingCheckout: 0 });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Correction Modal State
  const [correctModal, setCorrectModal] = useState({
    open: false,
    record: null,
    checkInTime: '',
    checkOutTime: '',
    status: 'present',
    correctionReason: ''
  });
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Fetch departments for filter
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await departmentApi.getAll();
        setDepartments(res.data || []);
      } catch (err) {
        console.error('Error loading departments:', err);
      }
    };
    loadDepts();
  }, []);

  // Fetch workforce attendance
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getWorkforceAttendance({
        date: selectedDate,
        department: selectedDept,
        status: selectedStatus,
        search
      });
      setRecords(res.data || []);
      setSummary(res.summary || { total: 0, present: 0, late: 0, halfDay: 0, missingCheckout: 0 });
    } catch (err) {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedDept, selectedStatus, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendance();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchAttendance]);

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName[0] : '';
    const l = lastName ? lastName[0] : '';
    return (f + l).toUpperCase() || 'E';
  };

  // Open Correction Modal
  const openCorrectionModal = (rec) => {
    const cinDate = rec.checkIn ? new Date(rec.checkIn) : null;
    const coutDate = rec.checkOut ? new Date(rec.checkOut) : null;

    const toTimeStr = (d) => {
      if (!d) return '';
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    setCorrectModal({
      open: true,
      record: rec,
      checkInTime: toTimeStr(cinDate),
      checkOutTime: toTimeStr(coutDate),
      status: rec.status === 'missing_checkout' ? 'present' : rec.status || 'present',
      correctionReason: rec.correctionReason || ''
    });
  };

  // Save Attendance Correction
  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!correctModal.correctionReason.trim()) {
      return toast.error('A correction reason is required for manual adjustment.');
    }

    setSavingCorrection(true);
    try {
      // Build ISO Date strings based on the record's date
      const recDate = correctModal.record.date;
      let newCheckIn = null;
      let newCheckOut = null;

      if (correctModal.checkInTime) {
        newCheckIn = new Date(`${recDate}T${correctModal.checkInTime}:00`);
      }
      if (correctModal.checkOutTime) {
        newCheckOut = new Date(`${recDate}T${correctModal.checkOutTime}:00`);
      }

      await attendanceApi.correctAttendance(correctModal.record._id, {
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        status: correctModal.status,
        correctionReason: correctModal.correctionReason
      });

      toast.success('Attendance record corrected successfully');
      setCorrectModal((prev) => ({ ...prev, open: false }));
      fetchAttendance();
    } catch (err) {
      toast.error(err.message || 'Failed to correct attendance');
    } finally {
      setSavingCorrection(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Attendance Board"
        description="Monitor daily workforce attendance, active working shifts, and manual attendance adjustments."
      />

      {/* Real Summary Metrics Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Records
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '4px' }}>
            {summary.total}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--neutral-400)', marginTop: '2px' }}>
            Filtered records
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--success-700)', fontWeight: 600, textTransform: 'uppercase' }}>
            Present / On Time
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--success-600)', marginTop: '4px' }}>
            {summary.present}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--neutral-400)', marginTop: '2px' }}>
            Arrived within grace period
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--warning-700)', fontWeight: 600, textTransform: 'uppercase' }}>
            Late Arrivals
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--warning-600)', marginTop: '4px' }}>
            {summary.late}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--neutral-400)', marginTop: '2px' }}>
            Check-in past grace period
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--danger-700)', fontWeight: 600, textTransform: 'uppercase' }}>
            Missing Checkout
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--danger-600)', marginTop: '4px' }}>
            {summary.missingCheckout}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--neutral-400)', marginTop: '2px' }}>
            Unclosed shift records
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
            <Calendar size={16} color="var(--primary-600)" />
            <input
              type="date"
              className="select-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '160px' }}
            />
          </div>

          {/* Search box */}
          <div style={{ flex: 1, minWidth: '220px', maxWidth: '360px' }}>
            <Input
              placeholder="Search employee or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
              rightAction={
                search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}
                  >
                    <X size={15} />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Department and Status Dropdowns */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              className="select-input"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>

            <select
              className="select-input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="missing_checkout">Missing Checkout</option>
              <option value="corrected">Corrected</option>
            </select>

            {(selectedDate !== todayStr || selectedDept || selectedStatus || search) && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setSelectedDept('');
                  setSelectedStatus('');
                  setSearch('');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Table */}
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
                icon={<Clock size={28} color="var(--primary-600)" />}
                title="No attendance records found"
                description={
                  selectedDate
                    ? `No attendance events were recorded on ${formatDate(selectedDate)} for the selected filters.`
                    : 'No attendance records match your filter criteria.'
                }
              />
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Worked Duration</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const emp = rec.employee;
                    const statusConfig = getStatusBadgeConfig(rec.displayStatus || rec.status);
                    const isWorking = !rec.checkOut && rec.date === todayStr;

                    return (
                      <tr key={rec._id}>
                        {/* Employee Avatar + Name */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary-100)',
                              color: 'var(--primary-700)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '12px',
                              flexShrink: 0
                            }}>
                              {getInitials(emp?.firstName, emp?.lastName)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                                {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee'}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--neutral-400)' }}>
                                {emp?.email || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ID */}
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--neutral-100)',
                            color: 'var(--neutral-700)'
                          }}>
                            {emp?.employeeId || '—'}
                          </span>
                        </td>

                        {/* Department */}
                        <td>
                          <Badge variant="primary">
                            {emp?.department?.name || 'Unassigned'}
                          </Badge>
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

                        {/* Status Badge */}
                        <td>
                          <Badge variant={statusConfig.variant} withDot>
                            {statusConfig.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCorrectionModal(rec)}
                            icon={<Edit2 size={13} />}
                          >
                            Correct
                          </Button>
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

      {/* ATTENDANCE CORRECTION MODAL */}
      <Modal
        isOpen={correctModal.open}
        onClose={() => setCorrectModal((prev) => ({ ...prev, open: false }))}
        title="Correct Attendance Record"
        maxWidth="500px"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCorrectModal((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="primary"
              onClick={handleSaveCorrection}
              loading={savingCorrection}
              loadingText="Saving..."
            >
              Save Correction
            </LoadingButton>
          </>
        }
      >
        <form onSubmit={handleSaveCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target employee overview pill */}
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--neutral-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--neutral-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--neutral-900)', fontSize: '14px' }}>
                {correctModal.record?.employee?.firstName} {correctModal.record?.employee?.lastName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                Date: {formatDate(correctModal.record?.date)} • ID: {correctModal.record?.employee?.employeeId}
              </div>
            </div>
            <Badge variant="primary">{correctModal.record?.status}</Badge>
          </div>

          <div className="form-grid-2">
            <Input
              label="Check-in Time"
              type="time"
              value={correctModal.checkInTime}
              onChange={(e) => setCorrectModal({ ...correctModal, checkInTime: e.target.value })}
              required
            />

            <Input
              label="Check-out Time"
              type="time"
              value={correctModal.checkOutTime}
              onChange={(e) => setCorrectModal({ ...correctModal, checkOutTime: e.target.value })}
              helperText="Leave empty if checkout was missed"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Attendance Status</label>
            <select
              className="select-input"
              value={correctModal.status}
              onChange={(e) => setCorrectModal({ ...correctModal, status: e.target.value })}
            >
              <option value="present">Present (Standard)</option>
              <option value="late">Late Arrival</option>
              <option value="half_day">Half Day (&lt; 5 hours)</option>
              <option value="corrected">Corrected (Manual Override)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Correction Reason <span style={{ color: 'var(--danger-500)' }}>*</span></span>
            </label>
            <textarea
              className="form-input"
              style={{ height: '80px', padding: '10px 12px', resize: 'vertical' }}
              placeholder="e.g. Employee forgot to clock out; verified manual departure at 17:00."
              value={correctModal.correctionReason}
              onChange={(e) => setCorrectModal({ ...correctModal, correctionReason: e.target.value })}
              required
            />
            <span className="form-helper-text">
              Mandatory reason recorded for accountability.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceBoardPage;
