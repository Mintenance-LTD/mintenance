import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  children: React.ReactNode;
}

// Brand colors - aligned with Mintenance design system
const BRAND_PRIMARY = '#0F172A'; // Navy
const BRAND_SECONDARY = '#10B981'; // Emerald
const BRAND_ACCENT = '#F59E0B'; // Amber

const buttonVariants = {
  primary: `bg-[${BRAND_PRIMARY}] text-white hover:bg-[#1E293B] focus:ring-[${BRAND_PRIMARY}]`,
  secondary: `bg-[${BRAND_SECONDARY}] text-white hover:bg-[#059669] focus:ring-[${BRAND_SECONDARY}]`,
  outline: `border-2 border-[${BRAND_PRIMARY}] bg-white text-[${BRAND_PRIMARY}] hover:bg-gray-50 focus:ring-[${BRAND_PRIMARY}]`,
  ghost: `text-gray-700 hover:bg-gray-100 focus:ring-[${BRAND_PRIMARY}]`,
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: `bg-[${BRAND_SECONDARY}] text-white hover:bg-[#059669] focus:ring-[${BRAND_SECONDARY}]`,
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-base min-h-[40px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
  xl: 'px-8 py-4 text-xl min-h-[56px]',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
        // WCAG AA minimum touch target
        'min-h-[44px]',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          role="status"
          aria-label="Loading"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
