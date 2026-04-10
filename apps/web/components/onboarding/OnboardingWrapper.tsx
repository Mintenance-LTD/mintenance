'use client';

/**
 * OnboardingWrapper Component
 * Wraps page content and shows the non-blocking tutorial guide.
 * Marks onboarding as complete on the server when finished or skipped,
 * so the tutorial never shows again.
 */

import React, { useCallback } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { TutorialSpotlight } from './TutorialSpotlight';

interface OnboardingWrapperProps {
  children: React.ReactNode;
  userType?: 'homeowner' | 'contractor';
  autoStart?: boolean;
}

export function OnboardingWrapper({
  children,
  userType = 'homeowner',
  autoStart = false,
}: OnboardingWrapperProps) {
  const markServerComplete = useCallback(async () => {
    try {
      const csrfToken =
        typeof document !== 'undefined'
          ? document.cookie
              .split('; ')
              .find(
                (c) =>
                  c.startsWith('csrf-token=') ||
                  c.startsWith('__Host-csrf-token=')
              )
              ?.split('=')[1]
          : undefined;
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: '{}',
      });
    } catch {
      // Silent fail — localStorage state is the primary guard
    }
  }, []);

  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    isFirstStep,
    isLastStep,
    completeStep,
    previousStep,
    skip,
  } = useOnboarding({
    userType,
    autoStart,
    onComplete: () => {
      markServerComplete();
    },
    onSkip: () => {
      markServerComplete();
    },
  });

  return (
    <>
      {children}

      {/* Tutorial guide overlay */}
      {isActive && currentStep && (
        <TutorialSpotlight
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onNext={() => completeStep()}
          onPrevious={!isFirstStep ? previousStep : undefined}
          onSkip={skip}
          onComplete={skip}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
        />
      )}
    </>
  );
}
