import React, { useId } from 'react';

/**
 * Reusable Form Input component with label, icons, and error handling
 */
export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  rightAction,
  id,
  className = '',
  required = false,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const inputClasses = [
    'form-input',
    error ? 'form-input-error' : '',
    leftIcon ? 'has-left-icon' : '',
    (rightIcon || rightAction) ? 'has-right-icon' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>{label} {required && <span style={{ color: 'var(--danger-500)' }}>*</span>}</span>
        </label>
      )}

      <div className="input-wrapper">
        {leftIcon && <span className="input-icon-left">{leftIcon}</span>}

        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          required={required}
          {...props}
        />

        {rightAction ? (
          <span className="input-icon-right">{rightAction}</span>
        ) : rightIcon ? (
          <span className="input-icon-right">{rightIcon}</span>
        ) : null}
      </div>

      {error ? (
        <span id={errorId} className="form-error-text" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="form-helper-text">
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
