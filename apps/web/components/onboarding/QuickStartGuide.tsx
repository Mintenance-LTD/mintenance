'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getOnboardingContent, tutorialSteps, type OnboardingContent } from '@/lib/config/onboarding-content';

interface QuickStartGuideProps {
  userRole: 'homeowner' | 'contractor';
  isOpen: boolean;
  onClose: () => void;
}

export function QuickStartGuide({ userRole, isOpen, onClose }: QuickStartGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const content: OnboardingContent = getOnboardingContent(userRole);
  const totalSteps = tutorialSteps.length;
  const currentStepContent = content[tutorialSteps[currentStep - 1]];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onClose();
    // Reset to first step for next time
    setTimeout(() => setCurrentStep(1), 300);
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-hidden p-0"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b"
          style={{
            borderColor: theme.colors.border,
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: theme.spacing[4],
          }}>
            <div style={{ flex: 1 }}>
              <DialogTitle style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}>
                Quick Start Guide
              </DialogTitle>
              <DialogDescription style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
              }}>
                Learn how to get the most out of Mintenance
              </DialogDescription>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: theme.spacing[2],
                borderRadius: theme.borderRadius.sm,
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Close guide"
            >
              <Icon name="x" size={20} color={theme.colors.textSecondary} />
            </button>
          </div>
        </DialogHeader>

        <div style={{
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[6],
        }}>
          {/* Step Navigation Pills */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing[2],
            padding: theme.spacing[3],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
          }}>
            {tutorialSteps.map((stepKey, index) => {
              const step = content[stepKey];
              const isActive = index + 1 === currentStep;
              const isCompleted = index + 1 < currentStep;
              
              return (
                <button
                  key={stepKey}
                  onClick={() => handleStepClick(index)}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                    border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                    backgroundColor: isActive 
                      ? theme.colors.primary 
                      : isCompleted 
                        ? theme.colors.success + '20'
                        : theme.colors.surface,
                    color: isActive 
                      ? theme.colors.textInverse 
                      : theme.colors.textPrimary,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = theme.colors.border;
                      e.currentTarget.style.backgroundColor = isCompleted 
                        ? theme.colors.success + '20'
                        : theme.colors.surface;
                    }
                  }}
                >
                  {isCompleted && (
                    <Icon name="check" size={12} color={theme.colors.success} />
                  )}
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Current Step Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[6],
            padding: theme.spacing[6],
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.lg,
          }}>
            {/* Icon */}
            {currentStepContent.icon && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: theme.colors.primary + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon name={currentStepContent.icon} size={40} color={theme.colors.primary} />
                </div>
              </div>
            )}

            {/* Title */}
            <h3 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              textAlign: 'center',
              margin: 0,
            }}>
              {currentStepContent.title}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
              textAlign: 'center',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {currentStepContent.description}
            </p>

            {/* Details List */}
            {currentStepContent.details && currentStepContent.details.length > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[3],
                padding: theme.spacing[4],
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
              }}>
                {currentStepContent.details.map((detail, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: theme.spacing[3],
                    }}
                  >
                    <div style={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: theme.colors.success + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}>
                      <Icon name="check" size={14} color={theme.colors.success} />
                    </div>
                    <span style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textPrimary,
                      lineHeight: 1.6,
                      flex: 1,
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
              paddingTop: theme.spacing[4],
              borderTop: `1px solid ${theme.colors.border}`,
            }}>
              <span style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textTertiary,
              }}>
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing[3],
            paddingTop: theme.spacing[4],
            borderTop: `1px solid ${theme.colors.border}`,
          }}>
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              style={{
                opacity: currentStep === 1 ? 0.5 : 1,
              }}
            >
              <Icon name="chevronLeft" size={16} color={theme.colors.textPrimary} />
              Previous
            </Button>

            <div style={{ display: 'flex', gap: theme.spacing[2] }}>
              {currentStep < totalSteps ? (
                <Button variant="primary" onClick={handleNext}>
                  Next
                  <Icon name="chevronRight" size={16} color={theme.colors.textInverse} />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleComplete}>
                  Got it!
                  <Icon name="check" size={16} color={theme.colors.textInverse} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

