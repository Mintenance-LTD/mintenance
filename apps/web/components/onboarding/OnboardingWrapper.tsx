'use client';

/**
 * OnboardingWrapper Component
 * Enhanced wrapper using the new onboarding system
 */

import React from 'react';
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
      console.log('Onboarding completed!');
    },
    onSkip: () => {
      console.log('Onboarding skipped');
    },
  });

  return (
    <>
      {children}

      {/* Tutorial spotlight overlay */}
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

