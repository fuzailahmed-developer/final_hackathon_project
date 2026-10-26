import React from 'react';
import { Button } from './Button';

/**
 * Button with loading state and spinner
 */
export const LoadingButton = ({
  children,
  loading = false,
  loadingText,
  disabled = false,
  variant = 'primary',
  ...props
}) => {
  return (
    <Button
      variant={variant}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className={`spinner ${
            variant === 'secondary' || variant === 'outline' || variant === 'ghost'
              ? 'spinner-dark'
              : ''
          }`}
          aria-hidden="true"
        />
      )}
      {loading ? (loadingText || children) : children}
    </Button>
  );
};

export default LoadingButton;
