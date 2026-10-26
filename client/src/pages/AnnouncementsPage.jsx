import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Users,
  Building2,
  Globe,
  UserCheck
} from 'lucide-react';

const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('hcm_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone', Icon: Globe },
  { value: 'hr', label: 'HR Team', Icon: UserCheck },
  { value: 'employees', label: 'All Employees', Icon: Users },
  { value: 'department', label: 'Specific Department', Icon: Building2 }
];

const AUDIENCE_LABEL = {
  all: 'Everyone',
  hr: 'HR Team',
  employees: 'All Employees',
  department: 'Department'
};

function AudienceBadge({ audience, departmentName }) {
  const colors = {
    all: { bg: '#dbeafe', color: '#1e40af' },
    hr: { bg: '#fce7f3', color: '#9d174d' },
    employees: { bg: '#d1fae5', color: '#065f46' },
    department: { bg: '#ede9fe', color: '#5b21b6' }
  };
  const c = colors[audience] || colors.all;
  const label = audience === 'department' && departmentName
    ? `Dept: ${departmentName}`
    : AUDIENCE_LABEL[audience] || audience;

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.color,
      textTransform: 'uppercase',
      letterSpacing: '0.3px'
    }}>
      {label}
    </span>
  );
}

function AnnouncementModal({ initial, departments, onSave, onClose }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    message: initial?.message || '',
    audience: initial?.audience || 'all',
    department: initial?.department?._id || initial?.department || '',
    isActive: initial?.isActive !== undefined ? initial.isActive : true
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.message.trim()) e.message = 'Message is required';
    if (form.audience === 'department' && !form.department) e.department = 'Department is required';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid var(--neutral-300)',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    color: 'var(--neutral-800)',
    backgroundColor: 'var(--neutral-0)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 150ms'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--neutral-700)',
    marginBottom: '6px'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--neutral-0)',
        borderRadius: 'var(--radius-xl)',
        width: '100%', maxWidth: '540px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid var(--neutral-100)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={18} color="var(--primary-600)" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--neutral-900)' }}>
              {initial ? 'Edit Announcement' : 'New Announcement'}
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--neutral-400)', padding: '4px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((er) => ({ ...er, title: '' })); }}
              placeholder="Announcement title"
              style={{ ...inputStyle, borderColor: errors.title ? '#ef4444' : 'var(--neutral-300)' }}
              maxLength={200}
            />
            {errors.title && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.title}</div>}
          </div>

          {/* Message */}
          <div>
            <label style={labelStyle}>Message <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              value={form.message}
              onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((er) => ({ ...er, message: '' })); }}
              placeholder="Write your announcement..."
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '100px', borderColor: errors.message ? '#ef4444' : 'var(--neutral-300)', fontFamily: 'inherit' }}
              maxLength={5000}
            />
            {errors.message && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.message}</div>}
          </div>

          {/* Audience */}
          <div>
            <label style={labelStyle}>Audience <span style={{ color: '#ef4444' }}>*</span></label>
            <select
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value, department: '' }))}
              style={{ ...inputStyle }}
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Department (conditional) */}
          {form.audience === 'department' && (
            <div>
              <label style={labelStyle}>Department <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                value={form.department}
                onChange={(e) => { setForm((f) => ({ ...f, department: e.target.value })); setErrors((er) => ({ ...er, department: '' })); }}
                style={{ ...inputStyle, borderColor: errors.department ? '#ef4444' : 'var(--neutral-300)' }}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
              {errors.department && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>{errors.department}</div>}
            </div>
          )}

          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--neutral-700)' }}>Published (visible to audience)</span>
          </label>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          padding: '14px 22px', borderTop: '1px solid var(--neutral-100)'
        }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px',
            fontWeight: 500, border: '1px solid var(--neutral-200)', color: 'var(--neutral-600)',
            backgroundColor: 'var(--neutral-0)', cursor: 'pointer'
          }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px',
              fontWeight: 600, backgroundColor: saving ? 'var(--neutral-400)' : 'var(--primary-600)',
              color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const role = user?.role || 'employee';
  const canManage = role === 'admin' || role === 'hr';

  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/announcements' + (role === 'admin' ? '?all=true' : ''));
      setAnnouncements(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [role]);

  const fetchDepartments = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await apiFetch('/departments');
      setDepartments(res.data || []);
    } catch (_) {}
  }, [canManage]);

  useEffect(() => {
    fetchAnnouncements();
    fetchDepartments();
  }, [fetchAnnouncements, fetchDepartments]);

  const handleSave = async (form) => {
    try {
      if (editing) {
        await apiFetch(`/announcements/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
        toast.success('Announcement updated');
      } else {
        await apiFetch('/announcements', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Announcement published');
      }
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message || 'Failed to save announcement');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/announcements/${deleteTarget._id}`, { method: 'DELETE' });
      toast.success('Announcement deleted');
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Megaphone size={22} color="var(--primary-600)" />
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>Announcements</h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--neutral-500)', margin: 0 }}>
            {canManage ? 'Create and manage organization-wide announcements.' : 'Organization announcements addressed to you.'}
          </p>
        </div>
        {canManage && (
          <button
            id="create-announcement-btn"
            onClick={() => { setEditing(null); setShowModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-600)', color: '#fff',
              fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
              transition: 'background-color 150ms'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-700)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-600)'; }}
          >
            <Plus size={16} />
            New Announcement
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: '100px', borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--neutral-100)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid #fca5a5',
          backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && announcements.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          backgroundColor: 'var(--neutral-0)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--neutral-200)'
        }}>
          <Megaphone size={36} color="var(--neutral-300)" style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-600)', marginBottom: '6px' }}>
            No announcements yet
          </div>
          <div style={{ fontSize: '13px', color: 'var(--neutral-400)' }}>
            {canManage ? 'Create your first announcement using the button above.' : 'There are no announcements for you at the moment.'}
          </div>
        </div>
      )}

      {/* Announcements list */}
      {!loading && !error && announcements.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {announcements.map((a) => (
            <div
              key={a._id}
              style={{
                backgroundColor: 'var(--neutral-0)',
                border: '1px solid var(--neutral-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                opacity: a.isActive ? 1 : 0.6,
                transition: 'box-shadow 150ms'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--neutral-900)' }}>{a.title}</span>
                    <AudienceBadge audience={a.audience} departmentName={a.department?.name} />
                    {!a.isActive && (
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', backgroundColor: 'var(--neutral-100)', color: 'var(--neutral-500)' }}>
                        DRAFT
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--neutral-600)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {a.message}
                  </p>
                </div>

                {/* Actions */}
                {canManage && (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditing(a); setShowModal(true); }}
                      style={{
                        padding: '6px 10px', borderRadius: 'var(--radius-md)', fontSize: '12px',
                        fontWeight: 500, border: '1px solid var(--neutral-200)', color: 'var(--neutral-600)',
                        backgroundColor: 'var(--neutral-0)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    {role === 'admin' && (
                      <button
                        onClick={() => setDeleteTarget(a)}
                        style={{
                          padding: '6px 10px', borderRadius: 'var(--radius-md)', fontSize: '12px',
                          fontWeight: 500, border: '1px solid #fca5a5', color: '#dc2626',
                          backgroundColor: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>
                  By <strong style={{ color: 'var(--neutral-600)' }}>{a.createdBy?.name || '—'}</strong>
                </span>
                <span style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>
                  {formatDate(a.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AnnouncementModal
          initial={editing}
          departments={departments}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--neutral-0)', borderRadius: 'var(--radius-xl)', padding: '28px',
            maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Trash2 size={18} color="#dc2626" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--neutral-900)' }}>Delete Announcement</span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--neutral-600)', marginBottom: '20px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)', color: 'var(--neutral-600)', backgroundColor: 'var(--neutral-0)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-md)', backgroundColor: '#dc2626', color: '#fff', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
