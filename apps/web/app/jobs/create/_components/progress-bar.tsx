import React from 'react';

/**
 * Job-creation step progress bar — Direction A · Mint Editorial.
 * Token-styled step circles + connector tracks.
 */

interface StepConfig {
  id: number;
  label: string;
  shortLabel: string;
}

interface ProgressBarProps {
  currentStep: number;
  steps: readonly StepConfig[];
}

export function ProgressBar({ currentStep, steps }: ProgressBarProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {steps.map((step, index) => {
          const reached = currentStep >= step.id;
          return (
            <React.Fragment key={step.id}>
              <div
                style={{ display: 'flex', alignItems: 'center' }}
                aria-label={`Step ${step.id}: ${step.label}`}
                aria-current={currentStep === step.id ? 'step' : undefined}
              >
                <div
                  aria-hidden='true'
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9999,
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 600,
                    fontSize: 14,
                    background: reached ? 'var(--me-brand)' : 'var(--me-bg-3)',
                    color: reached ? 'var(--me-on-brand)' : 'var(--me-ink-3)',
                    transition: 'background 0.2s ease',
                  }}
                >
                  {step.id}
                </div>
                <span
                  className='hidden sm:inline'
                  style={{
                    marginLeft: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: reached ? 'var(--me-ink)' : 'var(--me-ink-3)',
                  }}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    margin: '0 14px',
                    background: 'var(--me-line)',
                    borderRadius: 9999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: currentStep > step.id ? '100%' : '0%',
                      background: 'var(--me-brand)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
