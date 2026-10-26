import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../ui/Skeleton';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 1. Loading state: render layout skeleton to avoid flash
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--neutral-50)',
        overflow: 'hidden'
      }}>
        {/* Fake sidebar skeleton */}
        <div style={{
          width: '260px',
          borderRight: '1px solid var(--neutral-200)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <Skeleton width="120px" height="32px" />
          <Skeleton width="100%" height="40px" borderRadius="var(--radius-md)" />
          <Skeleton width="100%" height="40px" borderRadius="var(--radius-md)" />
          <Skeleton width="100%" height="40px" borderRadius="var(--radius-md)" />
        </div>
        {/* Fake main content skeleton */}
        <div style={{ flex: 1, padding: '32px' }}>
          <Skeleton width="220px" height="32px" style={{ marginBottom: '12px' }} />
          <Skeleton width="340px" height="18px" style={{ marginBottom: '32px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <Skeleton height="120px" borderRadius="var(--radius-lg)" />
            <Skeleton height="120px" borderRadius="var(--radius-lg)" />
            <Skeleton height="120px" borderRadius="var(--radius-lg)" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Unauthorized role: Redirect to dedicated Unauthorized page
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" state={{ attemptedPath: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
