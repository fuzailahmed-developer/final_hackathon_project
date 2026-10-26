import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/ui/Input';
import { LoadingButton } from '../components/ui/LoadingButton';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // If already authenticated, redirect to their role dashboard
  if (isAuthenticated && user?.role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please fill in both email and password.');
      return;
    }

    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      toast.success(`Welcome back, ${loggedInUser.name}`);

      // Check if user came from a protected route attempt
      const from = location.state?.from?.pathname;
      if (from && from !== '/unauthorized' && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        // Default role redirection
        navigate(`/${loggedInUser.role}/dashboard`, { replace: true });
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Invalid email or password';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper quick-fill for hackathon demonstration
  const setDemoCredentials = (role) => {
    setFormError('');
    if (role === 'admin') {
      setEmail('admin@hcm-lite.com');
      setPassword('Admin@123');
    } else if (role === 'hr') {
      setEmail('hr@hcm-lite.com');
      setPassword('Hr@123');
    } else if (role === 'employee') {
      setEmail('employee@hcm-lite.com');
      setPassword('Employee@123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--neutral-50)',
      padding: '24px 16px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: 'var(--neutral-900)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '18px',
            marginBottom: '14px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            H
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neutral-900)', letterSpacing: '-0.3px' }}>
            HCM Lite
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--neutral-500)', marginTop: '4px' }}>
            Human Capital Management Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: '32px 28px', backgroundColor: 'var(--neutral-0)' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neutral-900)' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--neutral-500)', marginTop: '2px' }}>
              Enter your corporate credentials to continue
            </p>
          </div>

          {/* Error Banner */}
          {formError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--danger-50)',
              border: '1px solid var(--danger-100)',
              color: 'var(--danger-700)',
              fontSize: '13px',
              marginBottom: '20px'
            }} role="alert">
              <AlertCircle size={16} color="var(--danger-600)" style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Input
              label="Work Email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              required
              autoComplete="current-password"
              rightAction={
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <LoadingButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              loadingText="Signing in..."
              style={{ marginTop: '6px' }}
            >
              Sign In
            </LoadingButton>
          </form>

          {/* Quick Demo Credential Autofill (For Hackathon Judges) */}
          <div style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid var(--neutral-100)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Demo Accounts (1-Click)
              </span>
              <ShieldCheck size={14} color="var(--neutral-400)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDemoCredentials('admin')}
                style={{
                  padding: '7px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--neutral-50)',
                  border: '1px solid var(--neutral-200)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--neutral-700)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--neutral-100)';
                  e.currentTarget.style.borderColor = 'var(--neutral-300)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--neutral-50)';
                  e.currentTarget.style.borderColor = 'var(--neutral-200)';
                }}
              >
                Admin
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('hr')}
                style={{
                  padding: '7px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--neutral-50)',
                  border: '1px solid var(--neutral-200)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--neutral-700)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--neutral-100)';
                  e.currentTarget.style.borderColor = 'var(--neutral-300)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--neutral-50)';
                  e.currentTarget.style.borderColor = 'var(--neutral-200)';
                }}
              >
                HR Manager
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('employee')}
                style={{
                  padding: '7px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--neutral-50)',
                  border: '1px solid var(--neutral-200)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--neutral-700)',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--neutral-100)';
                  e.currentTarget.style.borderColor = 'var(--neutral-300)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--neutral-50)';
                  e.currentTarget.style.borderColor = 'var(--neutral-200)';
                }}
              >
                Employee
              </button>
            </div>
          </div>
        </div>

        {/* Security badge footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '12px',
          color: 'var(--neutral-400)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={14} />
          <span>Server-enforced RBAC • HTTP-only JWT Sessions</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
