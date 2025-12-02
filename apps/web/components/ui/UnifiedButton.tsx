/**
 * Unified Button Component
 *
 * Standardized button with consistent styling, states, and accessibility.
 * Uses unified design tokens for all visual properties.
 *
 * @component
 * @example
 * // Primary button
 * <UnifiedButton variant="primary">Submit</UnifiedButton>
 *
 * // Outline button with icon
 * <UnifiedButton variant="outline" leftIcon={<Icon />}>Save</UnifiedButton>
 *
 * // Ghost button
 * <UnifiedButton variant="ghost">Cancel</UnifiedButton>
 *
 * Design Tokens Used:
 * - Primary color: #0066CC (ck-blue-500)
 * - Secondary color: #10B981 (ck-mint-500)
 * - Spacing: 4px base unit
 * - Border radius: 16px (lg)
 */

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================
// BUTTON VARIANTS
// ============================================

const buttonVariants = cva(
  // Base styles - consistent with design tokens
  "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary: Professional blue background (Checkatrade-inspired)
        primary: [
          "bg-ck-blue-500 text-white",
          "hover:bg-ck-blue-600 hover:shadow-md",
          "active:bg-ck-blue-700",
          "focus-visible:ring-ck-blue-500",
        ],
        // Outline: White background with blue border
        outline: [
          "bg-white text-ck-blue-600 border border-gray-200",
          "hover:bg-ck-blue-50 hover:border-ck-blue-300",
          "active:bg-ck-blue-100",
          "focus-visible:ring-ck-blue-500",
        ],
        // Ghost: Transparent background
        ghost: [
          "text-gray-700 bg-transparent",
          "hover:bg-gray-100 hover:text-gray-900",
          "active:bg-gray-200",
          "focus-visible:ring-gray-500",
        ],
        // Secondary: Warm orange (accent color)
        secondary: [
          "bg-ck-mint-500 text-white",
          "hover:bg-ck-mint-600 hover:shadow-md",
          "active:bg-ck-mint-700",
          "focus-visible:ring-ck-mint-500",
        ],
        // Danger: Red for destructive actions
        danger: [
          "bg-red-500 text-white",
          "hover:bg-red-600 hover:shadow-md",
          "active:bg-red-700",
          "focus-visible:ring-red-500",
        ],
        // Success: Green for positive actions
        success: [
          "bg-green-500 text-white",
          "hover:bg-green-600 hover:shadow-md",
          "active:bg-green-700",
          "focus-visible:ring-green-500",
        ],
        // Link: Text-only button
        link: [
          "text-ck-blue-600 underline-offset-4",
          "hover:text-ck-blue-700 hover:underline",
          "focus-visible:ring-ck-blue-600",
        ],
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md gap-1",     // 12px font
        sm: "h-8 px-3 text-sm rounded-md gap-1.5",     // 14px font
        md: "h-10 px-4 text-base rounded-lg gap-2",    // 16px font (default)
        lg: "h-12 px-6 text-lg rounded-lg gap-2",      // 18px font
        xl: "h-14 px-8 text-xl rounded-lg gap-3",      // 20px font
      },
      fullWidth: {
        true: "w-full",
      },
      loading: {
        true: "cursor-wait",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
      loading: false,
    },
  }
);

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  ariaLabel?: string;
}

// ============================================
// LOADING SPINNER
// ============================================

const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
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
);

// ============================================
// BUTTON COMPONENT
// ============================================

const UnifiedButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ariaLabel,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Determine if button should be disabled
    const isDisabled = disabled || loading;

    // Create accessible label
    const accessibleLabel = ariaLabel || (typeof children === 'string' ? children : undefined);

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading }),
          className
        )}
        disabled={isDisabled}
        aria-label={accessibleLabel}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading Spinner or Left Icon */}
        {loading ? (
          <LoadingSpinner className="mr-2" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}

        {/* Button Text */}
        <span className="truncate">{children}</span>

        {/* Right Icon */}
        {!loading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

UnifiedButton.displayName = 'UnifiedButton';

// ============================================
// BUTTON GROUP COMPONENT
// ============================================

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  attached?: boolean;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = 'horizontal',
  attached = false,
}) => {
  const groupClass = cn(
    'inline-flex',
    {
      'flex-row': orientation === 'horizontal',
      'flex-col': orientation === 'vertical',
      '-space-x-px': attached && orientation === 'horizontal',
      '-space-y-px': attached && orientation === 'vertical',
    },
    className
  );

  return (
    <div className={groupClass} role="group">
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const isFirst = index === 0;
        const isLast = index === React.Children.count(children) - 1;

        if (!attached) return child;

        // Apply rounded corners only to first/last items when attached
        return React.cloneElement(child as any, {
          className: cn(
            (child as any).props?.className,
            {
              'rounded-r-none': orientation === 'horizontal' && !isLast,
              'rounded-l-none': orientation === 'horizontal' && !isFirst,
              'rounded-b-none': orientation === 'vertical' && !isLast,
              'rounded-t-none': orientation === 'vertical' && !isFirst,
            }
          ),
        });
      })}
    </div>
  );
};

// ============================================
// ICON BUTTON VARIANT
// ============================================

interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  srOnly?: string; // Screen reader only text
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, srOnly, className, size = 'md', ...props }, ref) => {
    // Icon-only buttons have equal padding
    const iconSizeClasses = {
      xs: 'h-7 w-7',
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-14 w-14',
    };

    return (
      <UnifiedButton
        ref={ref}
        size={size}
        className={cn(iconSizeClasses[size as keyof typeof iconSizeClasses], 'p-0', className)}
        ariaLabel={srOnly}
        {...props}
      >
        {icon}
        {srOnly && <span className="sr-only">{srOnly}</span>}
      </UnifiedButton>
    );
  }
);

IconButton.displayName = 'IconButton';

export default UnifiedButton;