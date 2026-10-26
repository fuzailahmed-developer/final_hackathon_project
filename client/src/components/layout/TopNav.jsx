import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Menu, LogOut, ShieldCheck } from 'lucide-react';
import NotificationBell from '../ui/NotificationBell';

export const TopNav = ({ onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Signed out of HCM Lite');
      navigate('/login');
    } catch (err) {
      toast.error('Logout error occurred');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header style={{
      height: 'var(--topbar-height)',
      backgroundColor: 'var(--neutral-0)',
      borderBottom: '1px solid var(--neutral-200)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Left Area: Mobile menu & Context indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onOpenSidebar}
          className="mobile-hamburger-btn"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--neutral-700)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--neutral-100)'
          }}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="var(--primary-600)" />
          <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
            Workspace /
          </span>
          <span style={{ fontSize: '13px', color: 'var(--neutral-900)', fontWeight: 600 }}>
            HCM Lite Core
          </span>
        </div>
      </div>

      {/* Right Area: Notifications, User identity, role badge, logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Notification Bell */}
        <NotificationBell />

        {/* Role badge */}
        {user?.role && (
          <Badge role={user.role}>
            {user.role}
          </Badge>
        )}

        {/* User profile capsule */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px 4px 4px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--neutral-50)',
          border: '1px solid var(--neutral-200)'
        }}>
          {/* Avatar initial circle */}
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '12px'
          }}>
            {getInitials(user?.name)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }} className="user-name-display">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-800)', lineHeight: 1.2 }}>
              {user?.name || 'User'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--neutral-500)', lineHeight: 1.2 }}>
              {user?.email || ''}
            </span>
          </div>
        </div>

        {/* Logout action */}
        <button
          onClick={handleLogout}
          title="Sign out of system"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--neutral-600)',
            border: '1px solid var(--neutral-200)',
            backgroundColor: 'var(--neutral-0)',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--danger-50)';
            e.currentTarget.style.color = 'var(--danger-700)';
            e.currentTarget.style.borderColor = 'var(--danger-100)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--neutral-0)';
            e.currentTarget.style.color = 'var(--neutral-600)';
            e.currentTarget.style.borderColor = 'var(--neutral-200)';
          }}
        >
          <LogOut size={15} />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
