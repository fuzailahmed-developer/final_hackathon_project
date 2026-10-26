import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  CalendarCheck,
  CreditCard,
  Sparkles,
  Shield,
  Layers,
  User,
  Clock,
  X,
  Megaphone
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 500,
    color: isActive ? '#ffffff' : 'var(--neutral-300)',
    backgroundColor: isActive ? 'var(--primary-600)' : 'transparent',
    transition: 'all var(--transition-fast)'
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--neutral-900)',
          color: 'var(--neutral-300)',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'transform var(--transition-normal)'
        }}
      >
        {/* Brand Header */}
        <div style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '15px'
            }}>
              H
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.2px' }}>
                HCM Lite
              </div>
              <div style={{ fontSize: '11px', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Human Capital
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="mobile-close-btn"
            style={{
              color: 'var(--neutral-400)',
              padding: '6px',
              borderRadius: '6px',
              display: 'none'
            }}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Main Section */}
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--neutral-500)',
              letterSpacing: '0.6px',
              padding: '0 12px 8px'
            }}>
              Main
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <NavLink to={`/${role}/dashboard`} onClick={onClose} style={linkStyle}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>

              {/* ADMIN ROUTES */}
              {role === 'admin' && (
                <>
                  <NavLink to="/admin/settings" onClick={onClose} style={linkStyle}>
                    <Settings size={18} />
                    <span>Organization Settings</span>
                  </NavLink>
                  <NavLink to="/hr/employees" onClick={onClose} style={linkStyle}>
                    <Users size={18} />
                    <span>Workforce Directory</span>
                  </NavLink>
                  <NavLink to="/hr/attendance" onClick={onClose} style={linkStyle}>
                    <Clock size={18} />
                    <span>Attendance Board</span>
                  </NavLink>
                  <NavLink to="/hr/dashboard" onClick={onClose} style={linkStyle}>
                    <CalendarCheck size={18} />
                    <span>Leave Applications</span>
                  </NavLink>
                  <NavLink to="/admin/dashboard" onClick={onClose} style={linkStyle}>
                    <CreditCard size={18} />
                    <span>Payroll &amp; Payslips</span>
                  </NavLink>
                  <NavLink to="/admin/announcements" onClick={onClose} style={linkStyle}>
                    <Megaphone size={18} />
                    <span>Announcements</span>
                  </NavLink>
                  <NavLink to="/admin/audit" onClick={onClose} style={linkStyle}>
                    <Shield size={18} />
                    <span>Audit Log</span>
                  </NavLink>
                </>
              )}

              {/* HR ROUTES */}
              {role === 'hr' && (
                <>
                  <NavLink to="/hr/employees" onClick={onClose} style={linkStyle} end>
                    <Users size={18} />
                    <span>Employee Directory</span>
                  </NavLink>
                  <NavLink to="/hr/employees/new" onClick={onClose} style={linkStyle}>
                    <UserPlus size={18} />
                    <span>Add Employee</span>
                  </NavLink>
                  <NavLink to="/hr/attendance" onClick={onClose} style={linkStyle}>
                    <Clock size={18} />
                    <span>Attendance Board</span>
                  </NavLink>
                  <NavLink to="/hr/dashboard" onClick={onClose} style={linkStyle}>
                    <CalendarCheck size={18} />
                    <span>Leave Applications</span>
                  </NavLink>
                  <NavLink to="/admin/dashboard" onClick={onClose} style={linkStyle}>
                    <CreditCard size={18} />
                    <span>Payroll &amp; Payslips</span>
                  </NavLink>
                  <NavLink to="/hr/announcements" onClick={onClose} style={linkStyle}>
                    <Megaphone size={18} />
                    <span>Announcements</span>
                  </NavLink>
                </>
              )}

              {/* EMPLOYEE ROUTES */}
              {role === 'employee' && (
                <>
                  <NavLink to="/employee/attendance" onClick={onClose} style={linkStyle}>
                    <Clock size={18} />
                    <span>My Attendance</span>
                  </NavLink>
                  <NavLink to="/employee/profile" onClick={onClose} style={linkStyle}>
                    <User size={18} />
                    <span>My Profile 360</span>
                  </NavLink>
                  <NavLink to="/employee/dashboard" onClick={onClose} style={linkStyle}>
                    <CalendarCheck size={18} />
                    <span>Leave Applications</span>
                  </NavLink>
                  <NavLink to="/employee/dashboard" onClick={onClose} style={linkStyle}>
                    <CreditCard size={18} />
                    <span>Payroll &amp; Payslips</span>
                  </NavLink>
                  <NavLink to="/employee/announcements" onClick={onClose} style={linkStyle}>
                    <Megaphone size={18} />
                    <span>Announcements</span>
                  </NavLink>
                </>
              )}

              {/* AI HR Assistant */}
              <NavLink to={`/${role}/ai-assistant`} onClick={onClose} style={linkStyle}>
                <Sparkles size={18} color="var(--primary-400, #818cf8)" />
                <span>AI HR Assistant</span>
              </NavLink>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          fontSize: '12px',
          color: 'var(--neutral-400)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>HCM Lite Core</span>
          <span style={{
            fontSize: '10px',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            color: 'var(--primary-200)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 600
          }}>
            ACTIVE
          </span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
