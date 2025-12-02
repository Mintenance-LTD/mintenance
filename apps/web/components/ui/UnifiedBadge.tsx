/**
 * Unified Badge Component
 *
 * Standardized badge component with consistent colors and styling.
 * Used for status indicators, labels, and counts across the application.
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================
// BADGE VARIANTS
// ============================================

const badgeVariants = cva(
  // Base styles
  "inline-flex items-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: [
          "bg-gray-100 text-gray-700 border border-gray-200",
          "focus:ring-gray-500",
        ],
        primary: [
          "bg-teal-50 text-teal-700 border border-teal-200",
          "focus:ring-teal-500",
        ],
        success: [
          "bg-emerald-50 text-emerald-700 border border-emerald-200",
          "focus:ring-emerald-500",
        ],
        error: [
          "bg-red-50 text-red-700 border border-red-200",
          "focus:ring-red-500",
        ],
        warning: [
          "bg-amber-50 text-amber-700 border border-amber-200",
          "focus:ring-amber-500",
        ],
        info: [
          "bg-blue-50 text-blue-700 border border-blue-200",
          "focus:ring-blue-500",
        ],
        // Solid variants for higher emphasis
        solidPrimary: [
          "bg-teal-600 text-white border-transparent",
          "focus:ring-teal-500",
        ],
        solidSuccess: [
          "bg-emerald-500 text-white border-transparent",
          "focus:ring-emerald-500",
        ],
        solidError: [
          "bg-red-500 text-white border-transparent",
          "focus:ring-red-500",
        ],
        solidWarning: [
          "bg-amber-500 text-white border-transparent",
          "focus:ring-amber-500",
        ],
        solidInfo: [
          "bg-blue-500 text-white border-transparent",
          "focus:ring-blue-500",
        ],
        // Special purpose variants
        premium: [
          "bg-gradient-to-r from-amber-400 to-amber-500 text-white border-transparent",
          "focus:ring-amber-500",
        ],
        new: [
          "bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-transparent",
          "focus:ring-teal-500",
        ],
      },
      size: {
        xs: "px-1.5 py-0.5 text-xs rounded",
        sm: "px-2 py-0.5 text-xs rounded-md",
        md: "px-2.5 py-1 text-sm rounded-md",
        lg: "px-3 py-1.5 text-base rounded-lg",
      },
      shape: {
        rounded: "",
        pill: "rounded-full",
        square: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "rounded",
    },
  }
);

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  dot?: boolean;
  count?: number;
  max?: number;
  removable?: boolean;
  onRemove?: () => void;
}

// ============================================
// BADGE COMPONENT
// ============================================

const UnifiedBadge: React.FC<BadgeProps> = ({
  className,
  variant,
  size,
  shape,
  children,
  dot,
  count,
  max = 99,
  removable,
  onRemove,
  ...props
}) => {
  // Format count display
  const displayCount = count !== undefined
    ? count > max ? `${max}+` : count.toString()
    : null;

  return (
    <span
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    >
      {/* Dot indicator */}
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5",
            variant?.includes('solid') || variant === 'premium' || variant === 'new'
              ? "bg-white"
              : "bg-current"
          )}
          aria-hidden="true"
        />
      )}

      {/* Badge content */}
      {displayCount || children}

      {/* Remove button */}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className={cn(
            "ml-1 -mr-0.5 inline-flex items-center justify-center rounded-full p-0.5",
            "hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1",
            variant?.includes('solid') || variant === 'premium' || variant === 'new'
              ? "text-white focus:ring-white"
              : "text-current focus:ring-current"
          )}
          aria-label="Remove"
        >
          <svg
            className="h-3 w-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
};

// ============================================
// STATUS BADGE PRESETS
// ============================================

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'posted' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'pending' | 'approved' | 'rejected';
}

const statusConfig = {
  posted: { variant: 'info' as const, label: 'Posted', dot: true },
  assigned: { variant: 'warning' as const, label: 'Assigned', dot: true },
  'in-progress': { variant: 'primary' as const, label: 'In Progress', dot: true },
  completed: { variant: 'success' as const, label: 'Completed', dot: false },
  cancelled: { variant: 'default' as const, label: 'Cancelled', dot: false },
  pending: { variant: 'warning' as const, label: 'Pending', dot: true },
  approved: { variant: 'success' as const, label: 'Approved', dot: false },
  rejected: { variant: 'error' as const, label: 'Rejected', dot: false },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  ...props
}) => {
  const config = statusConfig[status];
  return (
    <UnifiedBadge variant={config.variant} dot={config.dot} {...props}>
      {children || config.label}
    </UnifiedBadge>
  );
};

// ============================================
// PRIORITY BADGE PRESETS
// ============================================

export interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

const priorityConfig = {
  urgent: { variant: 'solidError' as const, label: 'Urgent' },
  high: { variant: 'error' as const, label: 'High' },
  medium: { variant: 'warning' as const, label: 'Medium' },
  low: { variant: 'success' as const, label: 'Low' },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  children,
  ...props
}) => {
  const config = priorityConfig[priority];
  return (
    <UnifiedBadge variant={config.variant} {...props}>
      {children || config.label}
    </UnifiedBadge>
  );
};

// ============================================
// CATEGORY BADGE PRESETS
// ============================================

export interface CategoryBadgeProps extends Omit<BadgeProps, 'variant'> {
  category: 'plumbing' | 'electrical' | 'hvac' | 'handyman' | 'cleaning' | 'landscaping' | 'appliance' | 'painting';
}

const categoryColors = {
  plumbing: 'bg-sky-100 text-sky-700 border-sky-200',
  electrical: 'bg-amber-100 text-amber-700 border-amber-200',
  hvac: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  handyman: 'bg-violet-100 text-violet-700 border-violet-200',
  cleaning: 'bg-rose-100 text-rose-700 border-rose-200',
  landscaping: 'bg-green-100 text-green-700 border-green-200',
  appliance: 'bg-pink-100 text-pink-700 border-pink-200',
  painting: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const categoryLabels = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  handyman: 'Handyman',
  cleaning: 'Cleaning',
  landscaping: 'Landscaping',
  appliance: 'Appliance',
  painting: 'Painting',
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  children,
  className,
  size = 'md',
  shape = 'pill',
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium transition-colors",
        size === 'xs' && "px-1.5 py-0.5 text-xs",
        size === 'sm' && "px-2 py-0.5 text-xs",
        size === 'md' && "px-2.5 py-1 text-sm",
        size === 'lg' && "px-3 py-1.5 text-base",
        shape === 'pill' && "rounded-full",
        shape === 'rounded' && "rounded-md",
        shape === 'square' && "rounded-none",
        categoryColors[category],
        className
      )}
      {...props}
    >
      {children || categoryLabels[category]}
    </span>
  );
};

// ============================================
// NOTIFICATION BADGE
// ============================================

interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
  pulse?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 99,
  className,
  pulse = true,
}) => {
  if (count === 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <div className="relative inline-flex">
      <span
        className={cn(
          "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center",
          "rounded-full bg-red-500 text-xs font-bold text-white",
          "ring-2 ring-white",
          className
        )}
      >
        {displayCount}
      </span>
      {pulse && count > 0 && (
        <span
          className="absolute -top-1 -right-1 h-5 w-5 animate-ping rounded-full bg-red-400 opacity-75"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// ============================================
// BADGE GROUP
// ============================================

interface BadgeGroupProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'xs' | 'sm' | 'md';
}

export const BadgeGroup: React.FC<BadgeGroupProps> = ({
  children,
  className,
  gap = 'sm',
}) => {
  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
  };

  return (
    <div className={cn('inline-flex flex-wrap items-center', gapClasses[gap], className)}>
      {children}
    </div>
  );
};

export default UnifiedBadge;