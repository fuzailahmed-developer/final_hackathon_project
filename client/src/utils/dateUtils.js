/**
 * Date, time, and duration formatting utilities
 */

export const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatTime = (timeInput) => {
  if (!timeInput) return '—';
  const d = new Date(timeInput);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return '—';
  const mins = Math.max(0, Number(minutes) || 0);
  if (mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

export const getStatusBadgeConfig = (status) => {
  switch (status) {
    case 'present':
      return { variant: 'success', label: 'Present' };
    case 'late':
      return { variant: 'warning', label: 'Late' };
    case 'half_day':
      return { variant: 'warning', label: 'Half Day' };
    case 'missing_checkout':
      return { variant: 'danger', label: 'Missing Checkout' };
    case 'corrected':
      return { variant: 'primary', label: 'Corrected' };
    default:
      return { variant: 'default', label: status || 'Unknown' };
  }
};
