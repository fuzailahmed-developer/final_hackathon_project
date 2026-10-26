import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { employeeApi, departmentApi, designationApi } from '../api/client';
import {
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  CalendarCheck,
  Edit2,
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const EmployeeDetailPage = ({ isSelfProfile = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit State
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [editModal, setEditModal] = useState({
    open: false,
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    department: '',
    designation: '',
    employmentStatus: 'active'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch employee details
  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (isSelfProfile) {
        res = await employeeApi.getMyProfile();
      } else {
        res = await employeeApi.getById(id);
      }
      setEmployee(res.data);
    } catch (err) {
      if (err.status === 403) {
        toast.error('You do not have permission to view this employee');
        navigate('/unauthorized');
      } else {
        toast.error('Failed to load employee record');
      }
    } finally {
      setLoading(false);
    }
  }, [id, isSelfProfile, navigate, toast]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // Can current user edit? (HR and Admin only)
  const canEdit = user?.role === 'admin' || user?.role === 'hr';

  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName[0] : '';
    const l = lastName ? lastName[0] : '';
    return (f + l).toUpperCase() || 'E';
  };

  const openEditModal = async () => {
    if (!employee) return;
    try {
      const deptRes = await departmentApi.getAll();
      setDepartments(deptRes.data || []);

      const desigRes = await designationApi.getAll(employee.department?._id || employee.department);
      setDesignations(desigRes.data || []);

      setEditModal({
        open: true,
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        phone: employee.phone || '',
        address: employee.address || '',
        department: employee.department?._id || employee.department || '',
        designation: employee.designation?._id || employee.designation || '',
        employmentStatus: employee.employmentStatus || 'active'
      });
    } catch (err) {
      toast.error('Failed to prepare edit form');
    }
  };

  const handleDeptChange = async (deptId) => {
    setEditModal((prev) => ({ ...prev, department: deptId, designation: '' }));
    if (deptId) {
      try {
        const res = await designationApi.getAll(deptId);
        setDesignations(res.data || []);
      } catch (err) {
        console.error('Failed to load designations for department:', err);
      }
    } else {
      setDesignations([]);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModal.firstName.trim() || !editModal.lastName.trim()) {
      return toast.error('First name and last name are required');
    }
    setSavingEdit(true);
    try {
      await employeeApi.update(employee._id, {
        firstName: editModal.firstName,
        lastName: editModal.lastName,
        phone: editModal.phone,
        address: editModal.address,
        department: editModal.department,
        designation: editModal.designation,
        employmentStatus: editModal.employmentStatus
      });
      toast.success('Employee details updated');
      setEditModal((prev) => ({ ...prev, open: false }));
      fetchEmployee();
    } catch (err) {
      toast.error(err.message || 'Failed to update employee details');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="140px" borderRadius="var(--radius-lg)" />
        <Skeleton height="300px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  if (!employee) {
    return (
      <Card style={{ padding: '40px' }}>
        <EmptyState
          icon={<AlertCircle size={28} color="var(--danger-500)" />}
          title="Employee record not found"
          description="The requested employee record could not be found or may have been deactivated."
          action={
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          }
        />
      </Card>
    );
  }

  const joinDateFormatted = employee.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '—';

  const dobFormatted = employee.dateOfBirth
    ? new Date(employee.dateOfBirth).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Not specified';

  return (
    <div>
      {/* Back button (if accessed from directory) */}
      {!isSelfProfile && (
        <button
          onClick={() => navigate('/hr/employees')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--neutral-500)',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '16px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Employee Directory</span>
        </button>
      )}

      {/* Profile 360 Header Card */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          padding: '28px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Avatar and Primary Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {getInitials(employee.firstName, employee.lastName)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--neutral-900)', letterSpacing: '-0.3px' }}>
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant={employee.employmentStatus === 'active' ? 'success' : 'default'} withDot>
                  {employee.employmentStatus === 'active' ? 'Active' : 'Inactive'}
                </Badge>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--neutral-100)',
                  color: 'var(--neutral-700)'
                }}>
                  {employee.employeeId}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--neutral-500)', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Briefcase size={14} /> {employee.designation?.name || 'No designation'} • {employee.department?.name || 'No department'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={14} /> {employee.email}
                </span>
                {employee.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Phone size={14} /> {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Edit CTA (for authorized HR/Admin) */}
          {canEdit && (
            <Button
              variant="outline"
              size="md"
              onClick={openEditModal}
              icon={<Edit2 size={15} />}
            >
              Edit Employee
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs for 360 View */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <User size={16} />
          <span>Profile Overview</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Clock size={16} />
          <span>Attendance</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          <CalendarCheck size={16} />
          <span>Leave Balance</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveTab('payroll')}
        >
          <CreditCard size={16} />
          <span>Payroll & Payslips</span>
        </button>
      </div>

      {/* TAB 1: Profile Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Identity and contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="form-grid-3">
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Date of Birth
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--neutral-800)', marginTop: '4px' }}>
                    {dobFormatted}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Gender
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--neutral-800)', marginTop: '4px', textTransform: 'capitalize' }}>
                    {employee.gender?.replace('_', ' ') || 'Not specified'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Contact Phone
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--neutral-800)', marginTop: '4px' }}>
                    {employee.phone || 'Not provided'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                  Residential Address
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--neutral-800)', marginTop: '4px' }}>
                  {employee.address || 'Not provided'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Employment & Hierarchy Placement</CardTitle>
              <CardDescription>Department, designation, and tenure dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="form-grid-3">
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Department
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-900)', marginTop: '4px' }}>
                    {employee.department?.name || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Designation
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-900)', marginTop: '4px' }}>
                    {employee.designation?.name || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Joining Date
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-900)', marginTop: '4px' }}>
                    {joinDateFormatted}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Security Information */}
          <Card>
            <CardHeader>
              <CardTitle>System & Account Security</CardTitle>
              <CardDescription>Authentication credentials and access status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="form-grid-3">
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Sign-In Account
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--neutral-800)', marginTop: '4px' }}>
                    {employee.email}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Role Privilege
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <Badge role="employee">Employee</Badge>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: 'var(--neutral-400)', fontWeight: 500, textTransform: 'uppercase' }}>
                    Password Status
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px', fontWeight: 600 }}>
                    {employee.user?.mustChangePassword ? (
                      <span style={{ color: 'var(--warning-700)' }}>Temporary (Requires update)</span>
                    ) : (
                      <span style={{ color: 'var(--success-600)' }}>Active & Verified</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Attendance (Roadmap placeholder) */}
      {activeTab === 'attendance' && (
        <Card style={{ padding: '32px' }}>
          <EmptyState
            icon={<Clock size={28} color="var(--primary-600)" />}
            title="Attendance Tracking (Upcoming Phase)"
            description="Daily biometric check-in, check-out, working hours calculation, and monthly presence logs will be activated in upcoming development chunks."
          />
        </Card>
      )}

      {/* TAB 3: Leave Balance (Roadmap placeholder) */}
      {activeTab === 'leaves' && (
        <Card style={{ padding: '32px' }}>
          <EmptyState
            icon={<CalendarCheck size={28} color="var(--primary-600)" />}
            title="Leave Management (Upcoming Phase)"
            description="Leave application workflows, manager approval states, and annual quota deductions (Annual, Sick, Casual) will display here in future chunks."
          />
        </Card>
      )}

      {/* TAB 4: Payroll & Payslips (Roadmap placeholder) */}
      {activeTab === 'payroll' && (
        <Card style={{ padding: '32px' }}>
          <EmptyState
            icon={<CreditCard size={28} color="var(--primary-600)" />}
            title="Compensation & Payslips (Upcoming Phase)"
            description="Salary structures, gross pay calculations, tax deductions, and downloadable monthly payslips will be generated in upcoming chunks."
          />
        </Card>
      )}

      {/* EDIT MODAL */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal((prev) => ({ ...prev, open: false }))}
        title={`Edit Details — ${employee.firstName} ${employee.lastName}`}
        maxWidth="600px"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveEdit}
              disabled={savingEdit}
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-grid-2">
            <Input
              label="First Name"
              value={editModal.firstName}
              onChange={(e) => setEditModal({ ...editModal, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={editModal.lastName}
              onChange={(e) => setEditModal({ ...editModal, lastName: e.target.value })}
              required
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Phone Number"
              value={editModal.phone}
              onChange={(e) => setEditModal({ ...editModal, phone: e.target.value })}
            />
            <Input
              label="Residential Address"
              value={editModal.address}
              onChange={(e) => setEditModal({ ...editModal, address: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="select-input"
                value={editModal.department}
                onChange={(e) => handleDeptChange(e.target.value)}
                required
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Job Designation</label>
              <select
                className="select-input"
                value={editModal.designation}
                onChange={(e) => setEditModal({ ...editModal, designation: e.target.value })}
                required
              >
                <option value="">Select Designation</option>
                {designations.map((des) => (
                  <option key={des._id} value={des._id}>{des.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Employment Status</label>
            <select
              className="select-input"
              value={editModal.employmentStatus}
              onChange={(e) => setEditModal({ ...editModal, employmentStatus: e.target.value })}
            >
              <option value="active">Active Employee</option>
              <option value="inactive">Inactive / On Leave</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeDetailPage;
