import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingButton } from '../components/ui/LoadingButton';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { employeeApi, departmentApi, designationApi } from '../api/client';
import {
  UserPlus,
  ArrowLeft,
  ShieldCheck,
  Copy,
  CheckCircle,
  AlertTriangle,
  User,
  Briefcase
} from 'lucide-react';

export const EmployeeRegistrationPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    address: '',
    employeeId: '',
    department: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'active'
  });

  // Success Modal State
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await departmentApi.getAll();
        const activeDepts = (res.data || []).filter((d) => d.isActive);
        setDepartments(activeDepts);
        if (activeDepts.length > 0) {
          setFormData((prev) => ({ ...prev, department: activeDepts[0]._id }));
          // Load designations for first department
          loadDesignations(activeDepts[0]._id);
        }
      } catch (err) {
        toast.error('Failed to load department options');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchDepts();
  }, [toast]);

  // Load designations for selected department
  const loadDesignations = async (deptId) => {
    if (!deptId) {
      setDesignations([]);
      return;
    }
    try {
      const res = await designationApi.getAll(deptId, true);
      const activeDesigs = res.data || [];
      setDesignations(activeDesigs);
      if (activeDesigs.length > 0) {
        setFormData((prev) => ({ ...prev, designation: activeDesigs[0]._id }));
      } else {
        setFormData((prev) => ({ ...prev, designation: '' }));
      }
    } catch (err) {
      console.error('Failed to load designations:', err);
    }
  };

  const handleDeptChange = (deptId) => {
    setFormData((prev) => ({ ...prev, department: deptId, designation: '' }));
    loadDesignations(deptId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return toast.error('First and last name are required');
    }
    if (!formData.email.trim()) {
      return toast.error('Work email is required');
    }
    if (!formData.employeeId.trim()) {
      return toast.error('Employee ID is required');
    }
    if (!formData.department) {
      return toast.error('Please select a department');
    }
    if (!formData.designation) {
      return toast.error('Please select a job designation');
    }

    setSubmitting(true);
    try {
      const res = await employeeApi.create(formData);
      toast.success('Employee registered successfully!');
      setSuccessData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to register employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successData) return;
    const credText = `HCM Lite Credentials:\nEmail: ${successData.employee.email}\nTemporary Password: ${successData.temporaryPassword}\nEmployee ID: ${successData.employee.employeeId}`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: 'prefer_not_to_say',
      address: '',
      employeeId: '',
      department: departments[0]?._id || '',
      designation: '',
      joiningDate: new Date().toISOString().split('T')[0],
      employmentStatus: 'active'
    });
    if (departments[0]?._id) {
      loadDesignations(departments[0]._id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Register New Employee"
        description="Onboard a new workforce member, allocate organizational role, and generate secure user credentials."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/hr/employees')}
            icon={<ArrowLeft size={16} />}
          >
            Back to Directory
          </Button>
        }
      />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Personal Details */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={18} color="var(--primary-600)" />
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Legal name, contact methods, and personal background</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-grid-2">
              <Input
                label="First Name"
                placeholder="e.g. David"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                placeholder="e.g. Miller"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2">
              <Input
                label="Work Email"
                type="email"
                placeholder="david.miller@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                helperText="Will be used as employee's sign-in identifier."
              />
              <Input
                label="Phone Number"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-grid-2">
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="select-input"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <Input
              label="Residential Address"
              placeholder="742 Evergreen Terrace, Springfield"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Employment & Placement Details */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={18} color="var(--primary-600)" />
              <div>
                <CardTitle>Employment & Role Allocation</CardTitle>
                <CardDescription>Organizational hierarchy, job placement, and corporate IDs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-grid-3">
              <Input
                label="Employee ID"
                placeholder="e.g. EMP-101"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
                helperText="Unique corporate identifier"
              />

              <div className="form-group">
                <label className="form-label">
                  <span>Department <span style={{ color: 'var(--danger-500)' }}>*</span></span>
                </label>
                <select
                  className="select-input"
                  value={formData.department}
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
                <label className="form-label">
                  <span>Designation <span style={{ color: 'var(--danger-500)' }}>*</span></span>
                </label>
                <select
                  className="select-input"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  required
                  disabled={designations.length === 0}
                >
                  <option value="">
                    {designations.length === 0 ? 'No designations found' : 'Select Designation'}
                  </option>
                  {designations.map((des) => (
                    <option key={des._id} value={des._id}>{des.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <Input
                label="Joining Date"
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                required
              />

              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <select
                  className="select-input"
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                >
                  <option value="active">Active (Onboarded)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
          <div style={{
            padding: '16px 24px',
            backgroundColor: 'var(--neutral-50)',
            borderTop: '1px solid var(--neutral-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--neutral-500)' }}>
              A temporary password will be generated securely and shown once after creation.
            </span>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="outline" onClick={() => navigate('/hr/employees')}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                variant="primary"
                loading={submitting}
                loadingText="Registering..."
                icon={<UserPlus size={16} />}
              >
                Complete Registration
              </LoadingButton>
            </div>
          </div>
        </Card>
      </form>

      {/* Success Modal Showing One-Time Temporary Password */}
      {successData && (
        <Modal
          isOpen={true}
          onClose={() => navigate(`/hr/employees/${successData.employee._id}`)}
          title="Employee Registration Successful"
          maxWidth="520px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button variant="ghost" onClick={handleResetForm}>
                Register Another
              </Button>
              <Button variant="primary" onClick={() => navigate(`/hr/employees/${successData.employee._id}`)}>
                View Employee 360
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--success-50)',
              border: '1px solid var(--success-100)',
              color: 'var(--success-700)'
            }}>
              <CheckCircle size={20} color="var(--success-600)" />
              <div>
                <strong>{successData.employee.firstName} {successData.employee.lastName}</strong> has been registered with ID <strong>{successData.employee.employeeId}</strong>.
              </div>
            </div>

            {/* Temporary password box */}
            <div style={{
              backgroundColor: 'var(--neutral-900)',
              color: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Temporary Login Password
                </span>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: copied ? 'var(--success-500)' : 'var(--primary-200)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={13} />
                  <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
              </div>

              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '1px',
                padding: '6px 0'
              }}>
                {successData.temporaryPassword}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>
                Account Email: <strong style={{ color: '#ffffff' }}>{successData.employee.email}</strong>
              </div>
            </div>

            {/* Security warning banner */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--warning-50)',
              border: '1px solid var(--warning-100)',
              color: 'var(--warning-700)',
              fontSize: '13px'
            }}>
              <AlertTriangle size={18} color="var(--warning-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Important Security Notice:</strong> Share this temporary password securely with the employee. It is hashed in the database and will <strong>not</strong> be displayed again. The user will be required to change it on their first sign in.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeRegistrationPage;
