import React from 'react';

/**
 * Reusable Design System Button
 * Variants: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * Sizes: 'sm' | 'md' | 'lg'
 */
export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled = false,
  type = 'button',
  icon = null,
  ...props
}, ref) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
