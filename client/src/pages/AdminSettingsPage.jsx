import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingButton } from '../components/ui/LoadingButton';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import {
  organizationApi,
  departmentApi,
  designationApi,
  leaveTypeApi,
  holidayApi,
  userManagementApi
} from '../api/client';
import {
  Building2,
  Clock,
  Layers,
  Award,
  Calendar,
  CalendarCheck,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  Users
} from 'lucide-react';

export const AdminSettingsPage = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('org');

  // Loading states
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingDesigs, setLoadingDesigs] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [loadingHrUsers, setLoadingHrUsers] = useState(false);

  // Data states
  const [orgData, setOrgData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    officeStartTime: '09:00',
    gracePeriodMinutes: 15,
    halfDayHours: 5,
    officeLatitude: '',
    officeLongitude: '',
    officeRadiusMeters: 100,
    weekendDays: ['Saturday', 'Sunday']
  });

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [hrUsers, setHrUsers] = useState([]);

  // Modals state
  const [deptModal, setDeptModal] = useState({ open: false, editing: null, name: '', description: '' });
  const [desigModal, setDesigModal] = useState({ open: false, editing: null, name: '', department: '', description: '' });
  const [leaveModal, setLeaveModal] = useState({ open: false, editing: null, name: '', annualQuota: 14, isUnpaid: false, description: '' });
  const [holidayModal, setHolidayModal] = useState({ open: false, editing: null, name: '', date: '', description: '' });
  const [hrModal, setHrModal] = useState({ open: false, name: '', email: '', password: '' });

  // 1. Fetch Organization settings
  const fetchOrg = useCallback(async () => {
    setLoadingOrg(true);
    try {
      const res = await organizationApi.getSettings();
      if (res.data) {
        setOrgData({
          name: res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          address: res.data.address || '',
          officeStartTime: res.data.officeStartTime || '09:00',
          gracePeriodMinutes: res.data.gracePeriodMinutes || 15,
          halfDayHours: res.data.halfDayHours || 5,
          officeLatitude: res.data.officeLatitude || '',
          officeLongitude: res.data.officeLongitude || '',
          officeRadiusMeters: res.data.officeRadiusMeters || 100,
          weekendDays: res.data.weekendDays || ['Saturday', 'Sunday']
        });
      }
    } catch (err) {
      toast.error('Failed to load organization settings');
    } finally {
      setLoadingOrg(false);
    }
  }, [toast]);

  // 2. Fetch Departments
  const fetchDepartments = useCallback(async () => {
    setLoadingDepts(true);
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data || []);
    } catch (err) {
      toast.error('Failed to load departments');
    } finally {
      setLoadingDepts(false);
    }
  }, [toast]);

  // 3. Fetch Designations
  const fetchDesignations = useCallback(async () => {
    setLoadingDesigs(true);
    try {
      const res = await designationApi.getAll();
      setDesignations(res.data || []);
    } catch (err) {
      toast.error('Failed to load designations');
    } finally {
      setLoadingDesigs(false);
    }
  }, [toast]);

  // 4. Fetch Leave Types
  const fetchLeaveTypes = useCallback(async () => {
    setLoadingLeaves(true);
    try {
      const res = await leaveTypeApi.getAll();
      setLeaveTypes(res.data || []);
    } catch (err) {
      toast.error('Failed to load leave types');
    } finally {
      setLoadingLeaves(false);
    }
  }, [toast]);

  // 5. Fetch Holidays
  const fetchHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const res = await holidayApi.getAll();
      setHolidays(res.data || []);
    } catch (err) {
      toast.error('Failed to load holidays');
    } finally {
      setLoadingHolidays(false);
    }
  }, [toast]);

  // 6. Fetch HR Users
  const fetchHrUsers = useCallback(async () => {
    setLoadingHrUsers(true);
    try {
      const res = await userManagementApi.getHrUsers();
      setHrUsers(res.data || []);
    } catch (err) {
      toast.error('Failed to load HR users');
    } finally {
      setLoadingHrUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  useEffect(() => {
    if (activeTab === 'departments') fetchDepartments();
    if (activeTab === 'designations') {
      fetchDepartments();
      fetchDesignations();
    }
    if (activeTab === 'leaves') fetchLeaveTypes();
    if (activeTab === 'holidays') fetchHolidays();
    if (activeTab === 'hr-users') fetchHrUsers();
  }, [activeTab, fetchDepartments, fetchDesignations, fetchLeaveTypes, fetchHolidays, fetchHrUsers]);

  // Handle Org Save
  const handleSaveOrg = async (e) => {
    e.preventDefault();
    if (!orgData.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSavingOrg(true);
    try {
      await organizationApi.saveSettings(orgData);
      toast.success('Organization settings saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingOrg(false);
    }
  };

  // Toggle Weekend Day
  const handleWeekendToggle = (day) => {
    const exists = orgData.weekendDays.includes(day);
    if (exists) {
      setOrgData((prev) => ({
        ...prev,
        weekendDays: prev.weekendDays.filter((d) => d !== day)
      }));
    } else {
      setOrgData((prev) => ({
        ...prev,
        weekendDays: [...prev.weekendDays, day]
      }));
    }
  };

  // Department Handlers
  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptModal.name.trim()) return toast.error('Department name is required');
    try {
      if (deptModal.editing) {
        await departmentApi.update(deptModal.editing._id, {
          name: deptModal.name,
          description: deptModal.description
        });
        toast.success('Department updated');
      } else {
        await departmentApi.create({
          name: deptModal.name,
          description: deptModal.description
        });
        toast.success('Department created');
      }
      setDeptModal({ open: false, editing: null, name: '', description: '' });
      fetchDepartments();
    } catch (err) {
      toast.error(err.message || 'Error saving department');
    }
  };

  const handleToggleDeptStatus = async (id) => {
    try {
      await departmentApi.toggleStatus(id);
      toast.success('Department status updated');
      fetchDepartments();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  // Designation Handlers
  const handleSaveDesig = async (e) => {
    e.preventDefault();
    if (!desigModal.name.trim()) return toast.error('Designation title is required');
    if (!desigModal.department) return toast.error('Please select a department');
    try {
      if (desigModal.editing) {
        await designationApi.update(desigModal.editing._id, {
          name: desigModal.name,
          department: desigModal.department,
          description: desigModal.description
        });
        toast.success('Designation updated');
      } else {
        await designationApi.create({
          name: desigModal.name,
          department: desigModal.department,
          description: desigModal.description
        });
        toast.success('Designation created');
      }
      setDesigModal({ open: false, editing: null, name: '', department: '', description: '' });
      fetchDesignations();
    } catch (err) {
      toast.error(err.message || 'Error saving designation');
    }
  };

  const handleToggleDesigStatus = async (id) => {
    try {
      await designationApi.toggleStatus(id);
      toast.success('Designation status updated');
      fetchDesignations();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  // Leave Type Handlers
  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (!leaveModal.name.trim()) return toast.error('Leave type name is required');
    try {
      if (leaveModal.editing) {
        await leaveTypeApi.update(leaveModal.editing._id, {
          name: leaveModal.name,
          annualQuota: leaveModal.isUnpaid ? 0 : Number(leaveModal.annualQuota),
          isUnpaid: leaveModal.isUnpaid,
          description: leaveModal.description
        });
        toast.success('Leave type updated');
      } else {
        await leaveTypeApi.create({
          name: leaveModal.name,
          annualQuota: leaveModal.isUnpaid ? 0 : Number(leaveModal.annualQuota),
          isUnpaid: leaveModal.isUnpaid,
          description: leaveModal.description
        });
        toast.success('Leave type created');
      }
      setLeaveModal({ open: false, editing: null, name: '', annualQuota: 14, isUnpaid: false, description: '' });
      fetchLeaveTypes();
    } catch (err) {
      toast.error(err.message || 'Error saving leave type');
    }
  };

  const handleToggleLeaveStatus = async (id) => {
    try {
      await leaveTypeApi.toggleStatus(id);
      toast.success('Leave type status updated');
      fetchLeaveTypes();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  // Holiday Handlers
  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!holidayModal.name.trim() || !holidayModal.date) {
      return toast.error('Holiday name and date are required');
    }
    try {
      if (holidayModal.editing) {
        await holidayApi.update(holidayModal.editing._id, {
          name: holidayModal.name,
          date: holidayModal.date,
          description: holidayModal.description
        });
        toast.success('Holiday updated');
      } else {
        await holidayApi.create({
          name: holidayModal.name,
          date: holidayModal.date,
          description: holidayModal.description
        });
        toast.success('Holiday added');
      }
      setHolidayModal({ open: false, editing: null, name: '', date: '', description: '' });
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || 'Error saving holiday');
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await holidayApi.delete(id);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || 'Error deleting holiday');
    }
  };

  // HR User Handlers
  const handleCreateHrUser = async (e) => {
    e.preventDefault();
    if (!hrModal.name.trim() || !hrModal.email.trim() || !hrModal.password) {
      return toast.error('All fields are required');
    }
    try {
      await userManagementApi.createHrUser({
        name: hrModal.name.trim(),
        email: hrModal.email.trim(),
        password: hrModal.password
      });
      toast.success('HR Manager account created successfully');
      setHrModal({ open: false, name: '', email: '', password: '' });
      fetchHrUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create HR account');
    }
  };

  const handleToggleHrStatus = async (id) => {
    try {
      await userManagementApi.toggleHrStatus(id);
      toast.success('HR user status updated');
      fetchHrUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update HR status');
    }
  };

  return (
    <div>
      <PageHeader
        title="Organization & Settings"
        description="Configure your enterprise profile, office policies, workforce departments, and HR personnel."
      />

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'org' ? 'active' : ''}`}
          onClick={() => setActiveTab('org')}
        >
          <Building2 size={16} />
          <span>Company & Office</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <Layers size={16} />
          <span>Departments</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'designations' ? 'active' : ''}`}
          onClick={() => setActiveTab('designations')}
        >
          <Award size={16} />
          <span>Designations</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          <CalendarCheck size={16} />
          <span>Leave Types & Quotas</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          <Calendar size={16} />
          <span>Holidays</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'hr-users' ? 'active' : ''}`}
          onClick={() => setActiveTab('hr-users')}
        >
          <UserPlus size={16} />
          <span>HR Managers</span>
        </button>
      </div>

      {/* TAB 1: Company & Office Settings */}
      {activeTab === 'org' && (
        <form onSubmit={handleSaveOrg} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loadingOrg ? (
            <Card style={{ padding: '24px' }}>
              <Skeleton width="40%" height="24px" style={{ marginBottom: '16px' }} />
              <Skeleton width="100%" height="180px" />
            </Card>
          ) : (
            <>
              {/* Company Info */}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>Primary business details and communication records</CardDescription>
                  </div>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-grid-2">
                    <Input
                      label="Company Name"
                      placeholder="e.g. Acme Global Technologies"
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      required
                    />
                    <Input
                      label="Corporate Email"
                      type="email"
                      placeholder="contact@company.com"
                      value={orgData.email}
                      onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-grid-2">
                    <Input
                      label="Phone Number"
                      placeholder="+1 (555) 000-0000"
                      value={orgData.phone}
                      onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                    />
                    <Input
                      label="Headquarters Address"
                      placeholder="100 Enterprise Way, Suite 400"
                      value={orgData.address}
                      onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Office & Timing Policies */}
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Office Timing & Attendance Policies</CardTitle>
                    <CardDescription>
                      Rules governing daily business hours, grace periods, and weekend schedules (Used for upcoming attendance tracking)
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-grid-3">
                    <Input
                      label="Office Start Time"
                      type="time"
                      value={orgData.officeStartTime}
                      onChange={(e) => setOrgData({ ...orgData, officeStartTime: e.target.value })}
                      required
                      helperText="Default standard arrival time (09:00)"
                    />

                    <Input
                      label="Grace Period (Minutes)"
                      type="number"
                      min="0"
                      max="60"
                      value={orgData.gracePeriodMinutes}
                      onChange={(e) => setOrgData({ ...orgData, gracePeriodMinutes: e.target.value })}
                      required
                      helperText="Minutes allowed before arrival is marked late (15 mins)"
                    />

                    <Input
                      label="Half-Day Threshold (Hours)"
                      type="number"
                      min="1"
                      max="12"
                      value={orgData.halfDayHours}
                      onChange={(e) => setOrgData({ ...orgData, halfDayHours: e.target.value })}
                      required
                      helperText="Working hours below which day is counted half (5 hrs)"
                    />
                  </div>

                  {/* Weekend selector */}
                  <div className="form-group">
                    <label className="form-label">Weekend Days</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const isSelected = orgData.weekendDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleWeekendToggle(day)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '13px',
                              fontWeight: 500,
                              border: isSelected ? '1px solid var(--primary-600)' : '1px solid var(--neutral-300)',
                              backgroundColor: isSelected ? 'var(--primary-50)' : 'var(--neutral-0)',
                              color: isSelected ? 'var(--primary-700)' : 'var(--neutral-700)',
                              cursor: 'pointer',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <span className="form-helper-text">
                      Selected days are treated as non-working weekends in shift and attendance calculations.
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
                    <LoadingButton
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={savingOrg}
                      loadingText="Saving Settings..."
                      icon={<Save size={16} />}
                    >
                      Save Organization Settings
                    </LoadingButton>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </form>
      )}

      {/* TAB 2: Departments */}
      {activeTab === 'departments' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Define organizational divisions and business units</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDeptModal({ open: true, editing: null, name: '', description: '' })}
              icon={<Plus size={15} />}
            >
              Add Department
            </Button>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {loadingDepts ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
                <Skeleton height="36px" />
              </div>
            ) : departments.length === 0 ? (
              <div style={{ padding: '24px' }}>
                <EmptyState
                  icon={<Layers size={24} color="var(--primary-600)" />}
                  title="No departments yet"
                  description="Create your first department to organize your workforce into distinct organizational teams."
                  action={
                    <Button
                      variant="primary"
                      onClick={() => setDeptModal({ open: true, editing: null, name: '', description: '' })}
                      icon={<Plus size={15} />}
                    >
                      Create Department
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Description</th>
                      <th>Active Workforce</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept._id}>
                        <td style={{ fontWeight: 600 }}>{dept.name}</td>
                        <td style={{ color: 'var(--neutral-500)', maxWidth: '300px' }}>
                          {dept.description || '—'}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Users size={14} color="var(--neutral-400)" />
                            <strong>{dept.employeeCount || 0}</strong> active
                          </span>
                        </td>
                        <td>
                          <Badge variant={dept.isActive ? 'success' : 'default'} withDot>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeptModal({
                                open: true,
                                editing: dept,
                                name: dept.name,
                                description: dept.description || ''
                              })}
                              icon={<Edit2 size={13} />}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleDeptStatus(dept._id)}
                            >
                              {dept.isActive ? 'Deactivate' : 'Activate'}
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
      )}

      {/* TAB 3: Designations */}
      {activeTab === 'designations' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Job Designations</CardTitle>
              <CardDescription>Professional roles and job titles assigned to departments</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDesigModal({
                open: true,
                editing: null,
                name: '',
                department: departments[0]?._id || '',
                description: ''
              })}
              icon={<Plus size={15} />}
            >
              Add Designation
            </Button>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {loadingDesigs ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
                <Skeleton height="36px" />
              </div>
            ) : designations.length === 0 ? (
              <div style={{ padding: '24px' }}>
                <EmptyState
                  icon={<Award size={24} color="var(--primary-600)" />}
                  title="No designations yet"
                  description="Add job designations associated with your departments to assign titles during employee onboarding."
                  action={
                    <Button
                      variant="primary"
                      onClick={() => setDesigModal({
                        open: true,
                        editing: null,
                        name: '',
                        department: departments[0]?._id || '',
                        description: ''
                      })}
                      icon={<Plus size={15} />}
                    >
                      Create Designation
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Designation Title</th>
                      <th>Department</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {designations.map((desig) => (
                      <tr key={desig._id}>
                        <td style={{ fontWeight: 600 }}>{desig.name}</td>
                        <td>
                          <Badge variant="primary">
                            {desig.department?.name || 'Unassigned'}
                          </Badge>
                        </td>
                        <td style={{ color: 'var(--neutral-500)', maxWidth: '300px' }}>
                          {desig.description || '—'}
                        </td>
                        <td>
                          <Badge variant={desig.isActive ? 'success' : 'default'} withDot>
                            {desig.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDesigModal({
                                open: true,
                                editing: desig,
                                name: desig.name,
                                department: desig.department?._id || desig.department,
                                description: desig.description || ''
                              })}
                              icon={<Edit2 size={13} />}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleDesigStatus(desig._id)}
                            >
                              {desig.isActive ? 'Deactivate' : 'Activate'}
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
      )}

      {/* TAB 4: Leave Types */}
      {activeTab === 'leaves' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Leave Types & Annual Quotas</CardTitle>
              <CardDescription>
                Challenge required categories: Annual (14), Sick (8), Casual (10), and Unpaid (Unlimited)
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setLeaveModal({ open: true, editing: null, name: '', annualQuota: 10, isUnpaid: false, description: '' })}
              icon={<Plus size={15} />}
            >
              Add Leave Category
            </Button>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {loadingLeaves ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
              </div>
            ) : leaveTypes.length === 0 ? (
              <div style={{ padding: '24px' }}>
                <EmptyState
                  icon={<CalendarCheck size={24} color="var(--primary-600)" />}
                  title="No leave types configured"
                  description="Configure paid and unpaid leave categories with their respective annual balances."
                />
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Leave Category</th>
                      <th>Annual Quota</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveTypes.map((lt) => (
                      <tr key={lt._id}>
                        <td style={{ fontWeight: 600 }}>{lt.name}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                          {lt.isUnpaid ? 'Unlimited' : `${lt.annualQuota} days / yr`}
                        </td>
                        <td>
                          <Badge variant={lt.isUnpaid ? 'warning' : 'success'}>
                            {lt.isUnpaid ? 'Unpaid' : 'Paid Leave'}
                          </Badge>
                        </td>
                        <td style={{ color: 'var(--neutral-500)' }}>
                          {lt.description || '—'}
                        </td>
                        <td>
                          <Badge variant={lt.isActive ? 'success' : 'default'} withDot>
                            {lt.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLeaveModal({
                                open: true,
                                editing: lt,
                                name: lt.name,
                                annualQuota: lt.annualQuota,
                                isUnpaid: lt.isUnpaid,
                                description: lt.description || ''
                              })}
                              icon={<Edit2 size={13} />}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleLeaveStatus(lt._id)}
                            >
                              {lt.isActive ? 'Deactivate' : 'Activate'}
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
      )}

      {/* TAB 5: Holidays */}
      {activeTab === 'holidays' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Company Holidays</CardTitle>
              <CardDescription>Official annual paid holidays and public non-working dates</CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setHolidayModal({ open: true, editing: null, name: '', date: '', description: '' })}
              icon={<Plus size={15} />}
            >
              Add Holiday
            </Button>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {loadingHolidays ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
              </div>
            ) : holidays.length === 0 ? (
              <div style={{ padding: '24px' }}>
                <EmptyState
                  icon={<Calendar size={24} color="var(--primary-600)" />}
                  title="No holidays configured"
                  description="Add your organization's holidays to prepare for holiday calendars and leave balance calculations."
                  action={
                    <Button
                      variant="primary"
                      onClick={() => setHolidayModal({ open: true, editing: null, name: '', date: '', description: '' })}
                      icon={<Plus size={15} />}
                    >
                      Add First Holiday
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Holiday Name</th>
                      <th>Calendar Date</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h) => {
                      const dateObj = new Date(h.date);
                      const formattedDate = dateObj.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });

                      return (
                        <tr key={h._id}>
                          <td style={{ fontWeight: 600 }}>{h.name}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary-700)', fontWeight: 500 }}>
                              <Calendar size={14} />
                              {formattedDate}
                            </span>
                          </td>
                          <td style={{ color: 'var(--neutral-500)' }}>
                            {h.description || '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHolidayModal({
                                  open: true,
                                  editing: h,
                                  name: h.name,
                                  date: h.date.split('T')[0],
                                  description: h.description || ''
                                })}
                                icon={<Edit2 size={13} />}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteHoliday(h._id)}
                                icon={<Trash2 size={13} />}
                              >
                                Delete
                              </Button>
                            </div>
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
      )}

      {/* TAB 6: HR Managers */}
      {activeTab === 'hr-users' && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>HR Managers & Talent Operators</CardTitle>
              <CardDescription>
                Authorized personnel with permissions to onboard employees and manage workforce records
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setHrModal({ open: true, name: '', email: '', password: '' })}
              icon={<UserPlus size={15} />}
            >
              Add HR Account
            </Button>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {loadingHrUsers ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
                <Skeleton height="36px" style={{ marginBottom: '12px' }} />
              </div>
            ) : hrUsers.length === 0 ? (
              <div style={{ padding: '24px' }}>
                <EmptyState
                  icon={<UserPlus size={24} color="var(--primary-600)" />}
                  title="No HR accounts created"
                  description="Create HR manager credentials so your talent team can log in and register employees."
                />
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Manager Name</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hrUsers.map((hr) => (
                      <tr key={hr._id}>
                        <td style={{ fontWeight: 600 }}>{hr.name}</td>
                        <td style={{ color: 'var(--neutral-600)' }}>{hr.email}</td>
                        <td>
                          <Badge role="hr">HR Manager</Badge>
                        </td>
                        <td>
                          <Badge variant={hr.isActive ? 'success' : 'default'} withDot>
                            {hr.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleHrStatus(hr._id)}
                          >
                            {hr.isActive ? 'Suspend' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: Department */}
      <Modal
        isOpen={deptModal.open}
        onClose={() => setDeptModal({ ...deptModal, open: false })}
        title={deptModal.editing ? 'Edit Department' : 'Create New Department'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeptModal({ ...deptModal, open: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveDept}>
              {deptModal.editing ? 'Save Changes' : 'Create Department'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveDept} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Department Name"
            placeholder="e.g. Engineering"
            value={deptModal.name}
            onChange={(e) => setDeptModal({ ...deptModal, name: e.target.value })}
            required
            autoFocus
          />
          <Input
            label="Description (Optional)"
            placeholder="Summary of responsibilities"
            value={deptModal.description}
            onChange={(e) => setDeptModal({ ...deptModal, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* MODAL: Designation */}
      <Modal
        isOpen={desigModal.open}
        onClose={() => setDesigModal({ ...desigModal, open: false })}
        title={desigModal.editing ? 'Edit Designation' : 'Create New Designation'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDesigModal({ ...desigModal, open: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveDesig}>
              {desigModal.editing ? 'Save Changes' : 'Create Designation'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveDesig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Designation Title"
            placeholder="e.g. Frontend Developer"
            value={desigModal.name}
            onChange={(e) => setDesigModal({ ...desigModal, name: e.target.value })}
            required
            autoFocus
          />

          <div className="form-group">
            <label className="form-label">
              <span>Department <span style={{ color: 'var(--danger-500)' }}>*</span></span>
            </label>
            <select
              className="select-input"
              value={desigModal.department}
              onChange={(e) => setDesigModal({ ...desigModal, department: e.target.value })}
              required
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Description (Optional)"
            placeholder="Role description"
            value={desigModal.description}
            onChange={(e) => setDesigModal({ ...desigModal, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* MODAL: Leave Type */}
      <Modal
        isOpen={leaveModal.open}
        onClose={() => setLeaveModal({ ...leaveModal, open: false })}
        title={leaveModal.editing ? 'Edit Leave Category' : 'Create Leave Category'}
        footer={
          <>
            <Button variant="outline" onClick={() => setLeaveModal({ ...leaveModal, open: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveLeave}>
              {leaveModal.editing ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Leave Category Name"
            placeholder="e.g. Parental Leave"
            value={leaveModal.name}
            onChange={(e) => setLeaveModal({ ...leaveModal, name: e.target.value })}
            required
            autoFocus
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
            <input
              type="checkbox"
              id="isUnpaidCheck"
              checked={leaveModal.isUnpaid}
              onChange={(e) => setLeaveModal({ ...leaveModal, isUnpaid: e.target.checked })}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="isUnpaidCheck" style={{ fontSize: '14px', color: 'var(--neutral-800)', cursor: 'pointer' }}>
              Unpaid Leave (Unlimited quota)
            </label>
          </div>

          {!leaveModal.isUnpaid && (
            <Input
              label="Annual Quota (Days / Year)"
              type="number"
              min="1"
              value={leaveModal.annualQuota}
              onChange={(e) => setLeaveModal({ ...leaveModal, annualQuota: e.target.value })}
              required
            />
          )}

          <Input
            label="Description (Optional)"
            placeholder="Policy notes or eligibility criteria"
            value={leaveModal.description}
            onChange={(e) => setLeaveModal({ ...leaveModal, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* MODAL: Holiday */}
      <Modal
        isOpen={holidayModal.open}
        onClose={() => setHolidayModal({ ...holidayModal, open: false })}
        title={holidayModal.editing ? 'Edit Holiday' : 'Add Company Holiday'}
        footer={
          <>
            <Button variant="outline" onClick={() => setHolidayModal({ ...holidayModal, open: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveHoliday}>
              {holidayModal.editing ? 'Save Changes' : 'Add Holiday'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Holiday Title"
            placeholder="e.g. Independence Day"
            value={holidayModal.name}
            onChange={(e) => setHolidayModal({ ...holidayModal, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="Calendar Date"
            type="date"
            value={holidayModal.date}
            onChange={(e) => setHolidayModal({ ...holidayModal, date: e.target.value })}
            required
          />

          <Input
            label="Description (Optional)"
            placeholder="Notes or observance details"
            value={holidayModal.description}
            onChange={(e) => setHolidayModal({ ...holidayModal, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* MODAL: HR User */}
      <Modal
        isOpen={hrModal.open}
        onClose={() => setHrModal({ ...hrModal, open: false })}
        title="Create HR Manager Account"
        footer={
          <>
            <Button variant="outline" onClick={() => setHrModal({ ...hrModal, open: false })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateHrUser}>
              Create HR User
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateHrUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Full Name"
            placeholder="e.g. Sarah Jenkins"
            value={hrModal.name}
            onChange={(e) => setHrModal({ ...hrModal, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="Corporate Email"
            type="email"
            placeholder="e.g. sarah.hr@company.com"
            value={hrModal.email}
            onChange={(e) => setHrModal({ ...hrModal, email: e.target.value })}
            required
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="At least 6 characters"
            value={hrModal.password}
            onChange={(e) => setHrModal({ ...hrModal, password: e.target.value })}
            required
            helperText="The user can use these credentials to log in as HR immediately."
          />
        </form>
      </Modal>
    </div>
  );
};

export default AdminSettingsPage;
