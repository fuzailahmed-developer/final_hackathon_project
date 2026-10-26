import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, X, Megaphone, Calendar, CreditCard, Info } from 'lucide-react';
import { API_BASE } from '../../api/client';

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

const TYPE_ICON = {
  leave_submitted: <Calendar size={14} />,
  leave_approved: <Check size={14} />,
  leave_rejected: <X size={14} />,
  announcement_published: <Megaphone size={14} />,
  payroll_finalized: <CreditCard size={14} />,
  general: <Info size={14} />
};

const TYPE_COLOR = {
  leave_submitted: 'var(--primary-500)',
  leave_approved: '#10b981',
  leave_rejected: '#ef4444',
  announcement_published: '#f59e0b',
  payroll_finalized: '#8b5cf6',
  general: 'var(--neutral-500)'
};

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications/unread-count');
      setUnreadCount(res.data?.count || 0);
    } catch (_) {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/notifications?limit=30');
      setNotifications(res.data || []);
      setUnreadCount(res.meta?.unreadCount || 0);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open) fetchNotifications();
    setOpen((v) => !v);
  };

  const markRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: open ? 'var(--neutral-100)' : 'transparent',
          border: '1px solid var(--neutral-200)',
          color: 'var(--neutral-600)',
          cursor: 'pointer',
          transition: 'all 150ms'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--neutral-100)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
              border: '2px solid var(--neutral-0)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxHeight: '480px',
            backgroundColor: 'var(--neutral-0)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--neutral-100)',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={15} color="var(--primary-600)" />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--neutral-800)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary-100)',
                    color: 'var(--primary-700)',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'var(--primary-600)',
                  fontWeight: 500,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-50)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral-400)', fontSize: '13px' }}>
                Loading…
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--neutral-400)',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Bell size={28} color="var(--neutral-300)" />
                <span>No notifications yet</span>
              </div>
            )}
            {!loading &&
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markRead(n._id)}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--neutral-50)',
                    cursor: n.isRead ? 'default' : 'pointer',
                    backgroundColor: n.isRead ? 'transparent' : 'var(--primary-50)',
                    transition: 'background-color 150ms'
                  }}
                  onMouseEnter={(e) => {
                    if (!n.isRead) e.currentTarget.style.backgroundColor = 'var(--primary-100)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = n.isRead ? 'transparent' : 'var(--primary-50)';
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: `${TYPE_COLOR[n.type] || 'var(--neutral-300)'}20`,
                      color: TYPE_COLOR[n.type] || 'var(--neutral-500)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '2px'
                    }}
                  >
                    {TYPE_ICON[n.type] || <Info size={14} />}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: n.isRead ? 500 : 600,
                        color: 'var(--neutral-800)',
                        lineHeight: 1.3,
                        marginBottom: '3px'
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--neutral-500)',
                        lineHeight: 1.4,
                        marginBottom: '4px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {n.message}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--neutral-400)' }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div
                      style={{
                        flexShrink: 0,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-500)',
                        marginTop: '6px'
                      }}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
