/**
 * Unified Card Component
 *
 * Standardized card component with consistent styling, shadows, and states.
 * Supports different variants and interaction patterns.
 *
 * @component
 * @example
 * // Default card with content
 * <UnifiedCard>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content here</CardContent>
 * </UnifiedCard>
 *
 * // Interactive card
 * <UnifiedCard variant="interactive" onClick={handleClick}>
 *   Content
 * </UnifiedCard>
 *
 * Design Tokens Used:
 * - Background: White (#FFFFFF)
 * - Border: neutral-200 (#E4E9F2)
 * - Shadow: sm, md, lg
 * - Padding: 24px (md) default
 * - Border radius: 20px (xl)
 */

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================
// CARD VARIANTS
// ============================================

const cardVariants = cva(
  // Base styles - consistent with design tokens
  "bg-white rounded-xl transition-all duration-200",
  {
    variants: {
      variant: {
        // Default: Standard card with subtle border and shadow
        default: [
          "border border-gray-200",
          "shadow-sm",
        ],
        // Elevated: Floating card with larger shadow
        elevated: [
          "shadow-lg",
          "border-0",
        ],
        // Interactive: Clickable card with hover effects
        interactive: [
          "border border-gray-200",
          "shadow-sm cursor-pointer",
          "hover:shadow-md hover:border-ck-blue-300",
          "active:shadow-sm",
        ],
        // Ghost: Minimal card with no border
        ghost: [
          "border border-transparent",
          "shadow-none",
          "hover:bg-gray-50",
        ],
        // Outline: Emphasized border, no shadow
        outline: [
          "border-2 border-gray-200",
          "shadow-none",
        ],
      },
      padding: {
        none: "p-0",
        sm: "p-4",     // 16px
        md: "p-6",     // 24px (default)
        lg: "p-8",     // 32px
        xl: "p-10",    // 40px
      },
      fullHeight: {
        true: "h-full",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      fullHeight: false,
    },
  }
);

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
  href?: string;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'between';
}

// ============================================
// CARD COMPONENT
// ============================================

const UnifiedCard = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, fullHeight, href, onClick, children, ...props }, ref) => {
    const cardClass = cn(cardVariants({ variant, padding, fullHeight }), className);

    // Handle click if href is provided
    const handleClick = href
      ? (e: React.MouseEvent<HTMLDivElement>) => {
          if (!e.defaultPrevented) {
            window.location.href = href;
          }
          onClick?.(e);
        }
      : onClick;

    // Add role and tabIndex for interactive cards
    const interactiveProps = (variant === 'interactive' || href || onClick) ? {
      role: 'button',
      tabIndex: 0,
      onClick: handleClick,
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick?.(e as any);
        }
      },
    } : {};

    return (
      <div
        ref={ref}
        className={cardClass}
        {...interactiveProps}
        {...props}
      >
        {children}
      </div>
    );
  }
);

UnifiedCard.displayName = 'UnifiedCard';

// ============================================
// CARD HEADER
// ============================================

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, actions, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between",
          "pb-4 mb-4 border-b border-gray-100",
          className
        )}
        {...props}
      >
        <div className="flex-1">
          {children}
        </div>
        {actions && (
          <div className="ml-4 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================
// CARD TITLE
// ============================================

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', children, ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={cn(
          "text-xl font-semibold text-gray-900",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'CardTitle';

// ============================================
// CARD DESCRIPTION
// ============================================

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-sm text-gray-600 mt-1",
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

// ============================================
// CARD CONTENT
// ============================================

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("text-gray-700", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

// ============================================
// CARD FOOTER
// ============================================

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = 'right', children, ...props }, ref) => {
    const alignmentClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3",
          "pt-4 mt-4 border-t border-gray-100",
          alignmentClasses[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// ============================================
// CARD GRID COMPONENT
// ============================================

interface CardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

export const CardGrid: React.FC<CardGridProps> = ({
  children,
  className,
  columns = 3,
  gap = 'md',
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
};

// ============================================
// STAT CARD VARIANT
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  trend,
  icon,
  className,
}) => {
  const trendColor = trend?.direction === 'up' ? 'text-emerald-600' : 'text-red-600';
  const TrendIcon = trend?.direction === 'up' ? '↑' : '↓';

  return (
    <UnifiedCard className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
          {trend && (
            <div className={cn("mt-2 flex items-center gap-1 text-sm", trendColor)}>
              <span>{TrendIcon}</span>
              <span className="font-medium">{trend.value}%</span>
              <span className="text-gray-600">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-teal-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </UnifiedCard>
  );
};

// ============================================
// ACTION CARD VARIANT
// ============================================

interface ActionCardProps {
  title: string;
  description: string;
  action: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => {
  return (
    <UnifiedCard variant="interactive" className={className}>
      <CardContent>
        <div className="flex items-start">
          {icon && (
            <div className="mr-4 p-3 bg-teal-50 rounded-lg shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (action.href) {
                  window.location.href = action.href;
                } else if (action.onClick) {
                  action.onClick();
                }
              }}
              className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              {action.label} →
            </button>
          </div>
        </div>
      </CardContent>
    </UnifiedCard>
  );
};

export default UnifiedCard;