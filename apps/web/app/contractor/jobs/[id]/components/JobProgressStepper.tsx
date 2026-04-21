import React from 'react';
import { Check } from 'lucide-react';
import { theme } from '@/lib/theme';
import type { ProgressStep } from '../stage-helpers';

export function JobProgressStepper({ steps }: { steps: ProgressStep[] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: `${theme.spacing[4]} ${theme.spacing[3]}`,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
        marginBottom: theme.spacing[6],
        overflowX: 'auto',
      }}
    >
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '64px',
              flex: 1,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step.completed
                  ? theme.colors.success
                  : step.active
                    ? theme.colors.primary
                    : theme.colors.backgroundTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow:
                  step.completed || step.active ? theme.shadows.sm : 'none',
              }}
            >
              {step.completed ? (
                <Check className='h-4 w-4 text-white' />
              ) : step.active ? (
                React.createElement(step.icon, {
                  className: 'h-4 w-4',
                  style: { color: 'white' },
                })
              ) : (
                React.createElement(step.icon, {
                  className: 'h-3.5 w-3.5',
                  style: { color: theme.colors.textTertiary },
                })
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
                color:
                  step.completed || step.active
                    ? theme.colors.textPrimary
                    : theme.colors.textTertiary,
                fontWeight: step.active
                  ? theme.typography.fontWeight.bold
                  : theme.typography.fontWeight.medium,
                marginTop: theme.spacing[2],
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: '2px',
                minWidth: '12px',
                maxWidth: '60px',
                backgroundColor: step.completed
                  ? theme.colors.success
                  : theme.colors.border,
                marginTop: '15px',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
