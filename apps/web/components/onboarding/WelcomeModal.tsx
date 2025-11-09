'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { WelcomeModalContent } from './WelcomeModalContent';
import { getOnboardingContent, tutorialSteps, type OnboardingContent } from '@/lib/config/onboarding-content';

interface WelcomeModalProps {
  isOpen: boolean;
  userRole: 'homeowner' | 'contractor';
  onComplete: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ isOpen, userRole, onComplete, onSkip }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const content: OnboardingContent = getOnboardingContent(userRole);
  const totalSteps = tutorialSteps.length;
  const currentStepContent = content[tutorialSteps[currentStep - 1]];

  if (!isOpen) return null;

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
    onComplete();
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: theme.spacing[4],
      }}
      onClick={(e) => {
        // Don't close on backdrop click - user must complete or skip
        e.stopPropagation();
      }}
    >
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: theme.spacing[4],
            right: theme.spacing[4],
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: theme.spacing[2],
            borderRadius: theme.borderRadius.sm,
            transition: 'background-color 0.2s',
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Skip tutorial"
        >
          Skip
        </button>

        {/* Content */}
        <WelcomeModalContent
          step={currentStepContent}
          stepNumber={currentStep}
          totalSteps={totalSteps}
        />

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: theme.spacing[3],
          marginTop: theme.spacing[6],
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
                Get Started
                <Icon name="check" size={16} color={theme.colors.textInverse} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

