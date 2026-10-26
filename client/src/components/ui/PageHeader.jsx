import React from 'react';

export const PageHeader = ({ title, description, actions, children }) => {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {(actions || children) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {actions || children}
        </div>
      )}
    </div>
  );
};

export const SectionHeader = ({ title, description, badge, actions }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neutral-900)' }}>
          {title}
        </h2>
        {badge}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};

export default PageHeader;
