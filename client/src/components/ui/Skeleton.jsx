import React from 'react';

export const Skeleton = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
};

export const SkeletonCard = () => {
  return (
    <div className="card" style={{ padding: '24px' }}>
      <Skeleton width="40%" height="20px" style={{ marginBottom: '12px' }} />
      <Skeleton width="75%" height="14px" style={{ marginBottom: '24px' }} />
      <Skeleton width="100%" height="60px" borderRadius="var(--radius-md)" />
    </div>
  );
};

export default Skeleton;
