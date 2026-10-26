import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--neutral-50)' }}>
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main App Content Wrapper */}
      <div
        className="dashboard-main-wrapper"
        style={{
          flex: 1,
          marginLeft: 'var(--sidebar-width)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left var(--transition-normal)'
        }}
      >
        <TopNav onOpenSidebar={() => setSidebarOpen(true)} />

        <main style={{ flex: 1, padding: '32px 28px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
