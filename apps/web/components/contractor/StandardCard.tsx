'use client';

import React, { ReactNode } from 'react';
import { contractorTheme, getTransitionClasses } from '@/lib/design-system/contractor-theme';
import { LucideIcon } from 'lucide-react';

interface StandardCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/**
 * StandardCard - Clean, consistent card component for contractor pages
 * Based on Airbnb design principles with minimal styling
 */
export function StandardCard({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick,
}: StandardCardProps) {
  const paddingMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl ${
        hover ? 'hover:shadow-md hover:border-gray-300' : ''
      } ${getTransitionClasses()} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        padding: paddingMap[padding],
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

/**
 * CardHeader - Consistent header for cards with icon support
 */
export function CardHeader({ title, subtitle, icon: Icon, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-6 ${className}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {Icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-teal-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardSection - Divider section within cards
 */
export function CardSection({ children, className = '' }: CardSectionProps) {
  return <div className={`border-t border-gray-100 pt-6 mt-6 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * CardFooter - Footer section for cards
 */
export function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={`flex items-center justify-between mt-6 pt-6 border-t border-gray-100 ${className}`}>{children}</div>;
}
