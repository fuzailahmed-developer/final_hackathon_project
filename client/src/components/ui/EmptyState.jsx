import React from 'react';
import { Layers } from 'lucide-react';

export const EmptyState = ({
  icon,
  title = 'No records found',
  description = 'There are no active records in this section yet.',
  action = null,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">
        {icon || <Layers size={24} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
