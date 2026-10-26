import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export const UnauthorizedPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const attemptedPath = location.state?.attemptedPath || 'a restricted resource';
  const role = user?.role || 'employee';

  const returnDashboard = () => {
    navigate(`/${role}/dashboard`, { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--neutral-50)',
      padding: '24px 16px'
    }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '36px 32px', textAlign: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--danger-50)',
          color: 'var(--danger-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <ShieldAlert size={28} />
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '8px' }}>
          Access Denied
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--neutral-600)', lineHeight: 1.5, marginBottom: '20px' }}>
          You do not have the required permissions to access <strong style={{ color: 'var(--neutral-800)' }}>{attemptedPath}</strong>.
          Your current account role is <span style={{
            textTransform: 'uppercase',
            fontWeight: 700,
            fontSize: '12px',
            color: 'var(--primary-700)',
            backgroundColor: 'var(--primary-50)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>{role}</span>.
        </p>

        <div style={{
          backgroundColor: 'var(--neutral-50)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: '13px',
          color: 'var(--neutral-500)',
          marginBottom: '24px',
          border: '1px solid var(--neutral-200)'
        }}>
          Server-side role-based access control (RBAC) enforces strict route authorization.
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button variant="primary" onClick={returnDashboard} icon={<ArrowLeft size={16} />}>
            Go to My Dashboard
          </Button>

          <Button variant="outline" onClick={async () => { await logout(); navigate('/login'); }} icon={<LogOut size={16} />}>
            Switch Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
