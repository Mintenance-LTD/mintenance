/**
 * StandardHeading Component
 *
 * Enforces typography hierarchy according to design tokens.
 * Provides consistent heading styles across the application.
 *
 * @component
 * @example
 * // Page title (H1)
 * <StandardHeading level={1}>Welcome to Mintenance</StandardHeading>
 *
 * // Section heading (H2)
 * <StandardHeading level={2}>Recent Jobs</StandardHeading>
 *
 * // Subsection heading (H3)
 * <StandardHeading level={3}>Job Details</StandardHeading>
 *
 * Design Tokens Used:
 * - H1: 32px (2rem) - Page titles, hero headings
 * - H2: 24px (1.5rem) - Section headings
 * - H3: 20px (1.25rem) - Subsection headings
 * - H4: 18px (1.125rem) - Card titles
 * - H5: 16px (1rem) - Small headings
 * - H6: 14px (0.875rem) - Tiny headings
 *
 * Font Weight: 600 (semibold) for all headings
 * Color: neutral-900 (#0F172A) for all headings
 */

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================
// HEADING VARIANTS
// ============================================

const headingVariants = cva(
  // Base styles for all headings
  "font-semibold text-gray-900",
  {
    variants: {
      level: {
        1: "text-4xl",    // 32px - Page titles
        2: "text-2xl",    // 24px - Section headings
        3: "text-xl",     // 20px - Subsection headings
        4: "text-lg",     // 18px - Card titles
        5: "text-base",   // 16px - Small headings
        6: "text-sm",     // 14px - Tiny headings
      },
      color: {
        default: "text-gray-900",       // Primary heading color
        primary: "text-ck-blue-600",    // Primary brand color
        secondary: "text-ck-mint-600", // Secondary brand color
        muted: "text-gray-600",         // Muted/secondary text
      },
      weight: {
        normal: "font-normal",     // 400
        medium: "font-medium",     // 500
        semibold: "font-semibold", // 600 (default)
        bold: "font-bold",         // 700
      },
      spacing: {
        tight: "tracking-tight",   // -0.025em
        normal: "tracking-normal", // 0
        wide: "tracking-wide",     // 0.025em
      },
    },
    defaultVariants: {
      level: 1,
      color: "default",
      weight: "semibold",
      spacing: "normal",
    },
  }
);

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface StandardHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  /**
   * The heading level (1-6)
   * Determines both semantic HTML tag and visual style
   */
  level: 1 | 2 | 3 | 4 | 5 | 6;

  /**
   * Optional: Override the HTML tag while keeping the visual style
   * Useful for maintaining proper semantic structure
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'span';

  /**
   * Content of the heading
   */
  children: React.ReactNode;
}

// ============================================
// HEADING COMPONENT
// ============================================

/**
 * StandardHeading Component
 *
 * Provides consistent, accessible headings throughout the application.
 * Enforces the design system's typography hierarchy.
 */
const StandardHeading = forwardRef<HTMLHeadingElement, StandardHeadingProps>(
  (
    {
      level,
      as,
      color,
      weight,
      spacing,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Determine the HTML tag to use
    const Component = as || (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');

    return (
      <Component
        ref={ref as any}
        className={cn(
          headingVariants({ level, color, weight, spacing }),
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

StandardHeading.displayName = 'StandardHeading';

// ============================================
// CONVENIENCE COMPONENTS
// ============================================

/**
 * PageTitle (H1)
 * Main page heading
 */
export const PageTitle = forwardRef<HTMLHeadingElement, Omit<StandardHeadingProps, 'level'>>(
  (props, ref) => <StandardHeading ref={ref} level={1} {...props} />
);
PageTitle.displayName = 'PageTitle';

/**
 * SectionHeading (H2)
 * Major section heading
 */
export const SectionHeading = forwardRef<HTMLHeadingElement, Omit<StandardHeadingProps, 'level'>>(
  (props, ref) => <StandardHeading ref={ref} level={2} {...props} />
);
SectionHeading.displayName = 'SectionHeading';

/**
 * SubsectionHeading (H3)
 * Subsection heading
 */
export const SubsectionHeading = forwardRef<HTMLHeadingElement, Omit<StandardHeadingProps, 'level'>>(
  (props, ref) => <StandardHeading ref={ref} level={3} {...props} />
);
SubsectionHeading.displayName = 'SubsectionHeading';

/**
 * CardHeading (H4)
 * Card and component titles
 */
export const CardHeading = forwardRef<HTMLHeadingElement, Omit<StandardHeadingProps, 'level'>>(
  (props, ref) => <StandardHeading ref={ref} level={4} {...props} />
);
CardHeading.displayName = 'CardHeading';

// ============================================
// HEADING GROUP COMPONENT
// ============================================

interface HeadingGroupProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

/**
 * HeadingGroup
 *
 * Groups a heading with supporting text (e.g., description)
 * Maintains consistent spacing
 */
export const HeadingGroup: React.FC<HeadingGroupProps> = ({
  children,
  className,
  spacing = 'md',
}) => {
  const spacingClasses = {
    sm: 'space-y-1',  // 4px
    md: 'space-y-2',  // 8px
    lg: 'space-y-4',  // 16px
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
};

// ============================================
// SUPPORTING TEXT COMPONENT
// ============================================

interface SupportingTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  size?: 'sm' | 'base' | 'lg';
}

/**
 * SupportingText
 *
 * Descriptive text that accompanies headings
 * Uses secondary text color
 */
export const SupportingText = forwardRef<HTMLParagraphElement, SupportingTextProps>(
  ({ children, size = 'base', className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'text-sm',    // 14px
      base: 'text-base', // 16px
      lg: 'text-lg',    // 18px
    };

    return (
      <p
        ref={ref}
        className={cn(
          'text-gray-600',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

SupportingText.displayName = 'SupportingText';

export default StandardHeading;
