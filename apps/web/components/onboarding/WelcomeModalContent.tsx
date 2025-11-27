import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { TutorialStep } from '@/lib/config/onboarding-content';

interface WelcomeModalContentProps {
  step: TutorialStep;
  stepNumber: number;
  totalSteps: number;
}

export function WelcomeModalContent({ step, stepNumber, totalSteps }: WelcomeModalContentProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing[6],
      padding: theme.spacing[4],
    }}>
      {/* Icon/Image */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing[2],
      }}>
        {step.icon && (
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: theme.colors.primary + '15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name={step.icon} size={40} color={theme.colors.primary} />
          </div>
        )}
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        margin: 0,
      }}>
        {step.title}
      </h2>

      {/* Description */}
      <p style={{
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {step.description}
      </p>

      {/* Details List */}
      {step.details && step.details.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[3],
          padding: theme.spacing[4],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
        }}>
          {step.details.map((detail, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: theme.spacing[2],
              }}
            >
              <Icon name="checkCircle" size={20} color={theme.colors.success} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                lineHeight: 1.6,
              }}>
                {detail}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Progress Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing[2],
        marginTop: theme.spacing[2],
      }}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            style={{
              width: index === stepNumber - 1 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: index === stepNumber - 1
                ? theme.colors.primary
                : theme.colors.border,
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

