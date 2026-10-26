import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { employeeApi, departmentApi, designationApi } from '../api/client';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  X,
  Eye,
  Edit2,
  Calendar,
  Building,
  Mail,
  Phone
} from 'lucide-react';

export const EmployeeDirectoryPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Edit Modal State
  const [editModal, setEditModal] = useState({
    open: false,
    employee: null,
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    department: '',
    designation: '',
    employmentStatus: 'active'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch employees with filters
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeApi.getAll({
        search,
        department: selectedDept,
        status: selectedStatus
      });
      setEmployees(res.data || []);
    } catch (err) {
      toast.error('Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedStatus, toast]);

  // Fetch departments for filtering
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await departmentApi.getAll();
        setDepartments(res.data || []);
      } catch (err) {
        console.error('Error loading departments filter:', err);
      }
    };
    loadDepts();
  }, []);

  // Debounced employee search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  // Helper avatar initials
  const getInitials = (firstName, lastName) => {
    const f = firstName ? firstName[0] : '';
    const l = lastName ? lastName[0] : '';
    return (f + l).toUpperCase() || 'E';
  };

  // Open Edit Modal
  const openEditModal = async (emp) => {
    try {
      // Load designations for the employee's department
      const desigRes = await designationApi.getAll(emp.department?._id || emp.department);
      setDesignations(desigRes.data || []);

      setEditModal({
        open: true,
        employee: emp,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        phone: emp.phone || '',
        address: emp.address || '',
        department: emp.department?._id || emp.department || '',
        designation: emp.designation?._id || emp.designation || '',
        employmentStatus: emp.employmentStatus || 'active'
      });
    } catch (err) {
      toast.error('Failed to prepare edit form');
    }
  };

  // When editing department in modal, reload designations
  const handleEditDeptChange = async (deptId) => {
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

  // Save Employee Edits
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModal.firstName.trim() || !editModal.lastName.trim()) {
      return toast.error('First name and last name are required');
    }
    setSavingEdit(true);
    try {
      await employeeApi.update(editModal.employee._id, {
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
      fetchEmployees();
    } catch (err) {
      toast.error(err.message || 'Failed to update employee');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Workforce Directory"
        description="Comprehensive list of registered organizational employees, department assignments, and job designations."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/hr/employees/new')}
            icon={<UserPlus size={16} />}
          >
            Add Employee
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search box */}
          <div style={{ flex: 1, minWidth: '240px', maxWidth: '420px', position: 'relative' }}>
            <Input
              placeholder="Search by name, ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              rightAction={
                search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Department & Status Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              className="select-input"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ width: '180px' }}
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
              style={{ width: '140px' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {(search || selectedDept || selectedStatus) && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setSearch('');
                  setSelectedDept('');
                  setSelectedStatus('');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Table Content */}
      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px' }}>
              <Skeleton height="40px" style={{ marginBottom: '12px' }} />
              <Skeleton height="40px" style={{ marginBottom: '12px' }} />
              <Skeleton height="40px" style={{ marginBottom: '12px' }} />
              <Skeleton height="40px" />
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: '40px 24px' }}>
              <EmptyState
                icon={<Users size={28} color="var(--primary-600)" />}
                title={search || selectedDept || selectedStatus ? 'No matching employees' : 'No employees yet'}
                description={
                  search || selectedDept || selectedStatus
                    ? 'No workforce members matched your search or filter criteria. Try adjusting your query.'
                    : 'Register your first employee to start building and managing your workforce records.'
                }
                action={
                  search || selectedDept || selectedStatus ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch('');
                        setSelectedDept('');
                        setSelectedStatus('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => navigate('/hr/employees/new')}
                      icon={<UserPlus size={16} />}
                    >
                      Add Employee
                    </Button>
                  )
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
                    <th>Designation</th>
                    <th>Joining Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const joinDate = emp.joiningDate
                      ? new Date(emp.joiningDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : '—';

                    return (
                      <tr key={emp._id}>
                        {/* Employee Avatar + Name + Email */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary-100)',
                              color: 'var(--primary-700)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '13px',
                              flexShrink: 0
                            }}>
                              {getInitials(emp.firstName, emp.lastName)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <Link
                                to={`/hr/employees/${emp._id}`}
                                style={{ fontWeight: 600, color: 'var(--neutral-900)', transition: 'color var(--transition-fast)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-600)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--neutral-900)')}
                              >
                                {emp.firstName} {emp.lastName}
                              </Link>
                              <span style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                                {emp.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--neutral-100)',
                            color: 'var(--neutral-700)'
                          }}>
                            {emp.employeeId}
                          </span>
                        </td>

                        {/* Department */}
                        <td>
                          <Badge variant="primary">
                            {emp.department?.name || 'Unassigned'}
                          </Badge>
                        </td>

                        {/* Designation */}
                        <td style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>
                          {emp.designation?.name || '—'}
                        </td>

                        {/* Joining Date */}
                        <td style={{ color: 'var(--neutral-600)' }}>
                          {joinDate}
                        </td>

                        {/* Status */}
                        <td>
                          <Badge variant={emp.employmentStatus === 'active' ? 'success' : 'default'} withDot>
                            {emp.employmentStatus === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>

                        {/* Action buttons */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/hr/employees/${emp._id}`)}
                              icon={<Eye size={13} />}
                            >
                              360 View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(emp)}
                              icon={<Edit2 size={13} />}
                            >
                              Edit
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

      {/* MODAL: Edit Employee Details */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal((prev) => ({ ...prev, open: false }))}
        title={`Edit Employee — ${editModal.employee?.employeeId}`}
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
                onChange={(e) => handleEditDeptChange(e.target.value)}
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

export default EmployeeDirectoryPage;
