'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from './Button';
import { getFadeInStyle } from '@/lib/theme-enhancements';

interface EmptyStateStep {
  title: string;
  description?: string;
  href?: string;
}

interface SupportLink {
  label: string;
  href: string;
}

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  nextSteps?: EmptyStateStep[];
  supportLink?: SupportLink;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'minimal' | 'illustrated';
}

/**
 * EmptyState Component
 * 
 * Displays an empty state with icon, title, description, and optional action.
 * Enhanced with better visual design and animations.
 * 
 * @example
 * <EmptyState
 *   icon="briefcase"
 *   title="No jobs found"
 *   description="Check back later or adjust your filters"
 *   actionLabel="Browse Jobs"
 *   onAction={() => router.push('/jobs')}
 * />
 */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  nextSteps,
  supportLink,
  className = '',
  style = {},
  variant = 'default',
}: EmptyStateProps) {
  const isMinimal = variant === 'minimal';
  const isIllustrated = variant === 'illustrated';
  const hasActions = Boolean(actionLabel && onAction) || Boolean(secondaryActionLabel && onSecondaryAction);

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMinimal ? theme.spacing[8] : theme.spacing[12],
    textAlign: 'center',
    borderRadius: theme.borderRadius['2xl'],
    border: `1px solid ${variant === 'default' ? `${theme.colors.border}66` : theme.colors.border}`,
    backgroundColor: variant === 'default' ? `${theme.colors.primary}05` : theme.colors.backgroundSecondary,
    boxShadow: isMinimal ? theme.shadows.lg : theme.shadows.md,
    ...getFadeInStyle(100),
    ...style,
  };

  return (
    <div className={`empty-state ${className}`} style={containerStyles}>
      {/* Icon */}
      {!isMinimal && (
        <div
          style={{
            width: isIllustrated ? '120px' : '80px',
            height: isIllustrated ? '120px' : '80px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.colors.primary}15 0%, ${theme.colors.primary}08 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing[6],
            border: `2px solid ${theme.colors.primary}20`,
          }}
        >
          <Icon
            name={icon}
            size={isIllustrated ? 48 : 32}
            color={theme.colors.primary}
          />
        </div>
      )}

      {/* Title */}
      <h3
        style={{
          margin: 0,
          marginBottom: description ? theme.spacing[2] : theme.spacing[4],
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            margin: 0,
            marginBottom: nextSteps?.length ? theme.spacing[4] : hasActions ? theme.spacing[6] : 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            maxWidth: '400px',
            lineHeight: theme.typography.lineHeight.relaxed,
          }}
        >
          {description}
        </p>
      )}

      {/* Next steps / education */}
      {nextSteps && nextSteps.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            textAlign: 'left',
            marginTop: theme.spacing[2],
          }}
        >
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
            }}
          >
            Next steps
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[3],
            }}
          >
            {nextSteps.map((step, index) => (
              <div
                key={`${step.title}-${index}`}
                style={{
                  padding: `${theme.spacing[3]}px ${theme.spacing[4]}px`,
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                }}
              >
                <div
                  style={{
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textPrimary,
                  }}
                >
                  {step.title}
                </div>
                {step.description && (
                  <p
                    style={{
                      margin: `${theme.spacing[1]}px 0 0`,
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm,
                      lineHeight: theme.typography.lineHeight.relaxed,
                    }}
                  >
                    {step.description}
                  </p>
                )}
                {step.href && (
                  <Link
                    href={step.href}
                    style={{
                      marginTop: theme.spacing[2],
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: theme.spacing[1],
                      color: theme.colors.primary,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                    }}
                  >
                    Learn more
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      {hasActions && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing[3],
            marginTop: theme.spacing[5],
          }}
        >
          {actionLabel && onAction && (
            <Button variant="primary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="ghost" size="md" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}

      {supportLink && (
        <Link
          href={supportLink.href}
          style={{
            marginTop: theme.spacing[4],
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            textDecoration: 'underline',
          }}
        >
          {supportLink.label}
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
