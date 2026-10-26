import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  role = null,
  withDot = false,
  className = '',
  ...props
}) => {
  let badgeClass = 'badge';

  if (role) {
    badgeClass += ` badge-role-${role.toLowerCase()}`;
  } else {
    badgeClass += ` badge-${variant}`;
  }

  if (className) {
    badgeClass += ` ${className}`;
  }

  return (
    <span className={badgeClass} {...props}>
      {withDot && !role && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export default Badge;
