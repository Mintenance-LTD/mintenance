'use client';

/**
 * useOnboarding Hook
 * Custom hook for managing onboarding state and flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOnboardingState,
  markStepComplete,
  setCurrentStep,
  getNextStep,
  skipOnboarding,
  resetOnboarding,
  isOnboardingComplete,
  getOnboardingProgress,
  shouldShowTooltip,
  markFeatureSeen,
  updateProfileCompletion,
  calculateProfileCompletion,
  OnboardingState,
  ProfileCompletionItem,
} from '@/lib/onboarding/onboarding-state';
import {
  getFlowByUserType,
  getStepById,
  getNextStepInFlow,
  getPreviousStepInFlow,
  getAllStepIds,
  OnboardingFlow,
  OnboardingStep,
} from '@/lib/onboarding/flows';

interface UseOnboardingOptions {
  userType?: 'homeowner' | 'contractor';
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function useOnboarding(options: UseOnboardingOptions = {}) {
  const { userType = 'homeowner', autoStart = false, onComplete, onSkip } = options;
  const router = useRouter();

  const [state, setState] = useState<OnboardingState>(getOnboardingState());
  const [flow, setFlow] = useState<OnboardingFlow>(getFlowByUserType(userType));
  const [currentStep, setCurrentStepState] = useState<OnboardingStep | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Initialize onboarding
  useEffect(() => {
    const state = getOnboardingState();
    setState(state);

    const flow = getFlowByUserType(userType);
    setFlow(flow);

    // Check if onboarding is already complete
    const allStepIds = getAllStepIds(flow);
    const complete = isOnboardingComplete(allStepIds);

    // Auto-start if enabled and not complete
    if (autoStart && !complete && !state.skippedAt) {
      startOnboarding();
    }

    // Resume if there's a current step
    if (state.currentStep) {
      const step = getStepById(flow, state.currentStep);
      if (step) {
        setCurrentStepState(step);
        setIsActive(true);
      }
    }
  }, [userType, autoStart]);

  /**
   * Start the onboarding flow
   */
  const startOnboarding = useCallback(() => {
    const allStepIds = getAllStepIds(flow);
    const nextStepId = getNextStep(allStepIds);

    if (nextStepId) {
      const step = getStepById(flow, nextStepId);
      if (step) {
        setCurrentStep(nextStepId);
        setCurrentStepState(step);
        setState(getOnboardingState());
        setIsActive(true);

        // Navigate to step route if specified
        if (step.targetRoute) {
          router.push(step.targetRoute);
        }
      }
    }
  }, [flow, router]);

  /**
   * Complete current step and advance to next
   */
  const completeStep = useCallback(
    (stepId?: string) => {
      const targetStepId = stepId || currentStep?.id;
      if (!targetStepId) return;

      // Mark step complete
      markStepComplete(targetStepId);

      // Get next step
      const nextStep = getNextStepInFlow(flow, targetStepId);

      if (nextStep) {
        // Advance to next step
        setCurrentStep(nextStep.id);
        setCurrentStepState(nextStep);
        setState(getOnboardingState());

        // Navigate to step route if specified
        if (nextStep.targetRoute) {
          router.push(nextStep.targetRoute);
        }
      } else {
        // Onboarding complete
        finishOnboarding();
      }
    },
    [currentStep, flow, router]
  );

  /**
   * Go to previous step
   */
  const previousStep = useCallback(() => {
    if (!currentStep) return;

    const prevStep = getPreviousStepInFlow(flow, currentStep.id);
    if (prevStep) {
      setCurrentStep(prevStep.id);
      setCurrentStepState(prevStep);
      setState(getOnboardingState());

      // Navigate to step route if specified
      if (prevStep.targetRoute) {
        router.push(prevStep.targetRoute);
      }
    }
  }, [currentStep, flow, router]);

  /**
   * Skip onboarding
   */
  const skip = useCallback(() => {
    skipOnboarding();
    setState(getOnboardingState());
    setIsActive(false);
    setCurrentStepState(null);

    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  /**
   * Finish onboarding
   */
  const finishOnboarding = useCallback(() => {
    setIsActive(false);
    setCurrentStepState(null);
    setState(getOnboardingState());

    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  /**
   * Reset onboarding (for testing)
   */
  const reset = useCallback(() => {
    resetOnboarding();
    setState(getOnboardingState());
    setIsActive(false);
    setCurrentStepState(null);
  }, []);

  /**
   * Get profile completion items based on user type
   */
  const getProfileCompletionItems = useCallback(
    (userData: any): ProfileCompletionItem[] => {
      if (userType === 'homeowner') {
        return [
          {
            id: 'profile-photo',
            label: 'Add profile photo',
            weight: 20,
            completed: !!userData?.profile_photo,
            action: '/profile',
          },
          {
            id: 'location',
            label: 'Add your location',
            weight: 15,
            completed: !!userData?.location,
            action: '/profile',
          },
          {
            id: 'bio',
            label: 'Complete your bio',
            weight: 10,
            completed: !!userData?.bio && userData.bio.length > 20,
            action: '/profile',
          },
          {
            id: 'property',
            label: 'Add a property',
            weight: 25,
            completed: userData?.properties_count > 0,
            action: '/properties',
          },
          {
            id: 'first-job',
            label: 'Post your first job',
            weight: 30,
            completed: userData?.jobs_count > 0,
            action: '/jobs/create',
          },
        ];
      } else {
        // contractor
        return [
          {
            id: 'profile-photo',
            label: 'Add profile photo',
            weight: 15,
            completed: !!userData?.profile_photo,
            action: '/contractor/profile',
          },
          {
            id: 'business-name',
            label: 'Set business name',
            weight: 10,
            completed: !!userData?.business_name,
            action: '/contractor/profile',
          },
          {
            id: 'bio',
            label: 'Write your bio',
            weight: 10,
            completed: !!userData?.bio && userData.bio.length > 50,
            action: '/contractor/profile',
          },
          {
            id: 'skills',
            label: 'Add skills (3+)',
            weight: 15,
            completed: userData?.skills_count >= 3,
            action: '/contractor/profile',
          },
          {
            id: 'service-areas',
            label: 'Set service areas',
            weight: 15,
            completed: !!userData?.service_radius,
            action: '/contractor/profile',
          },
          {
            id: 'portfolio',
            label: 'Upload portfolio (3+ photos)',
            weight: 25,
            completed: userData?.portfolio_count >= 3,
            action: '/contractor/profile',
          },
          {
            id: 'verification',
            label: 'Verify credentials',
            weight: 10,
            completed: userData?.is_verified,
            action: '/contractor/verification',
          },
        ];
      }
    },
    [userType]
  );

  /**
   * Calculate profile completion percentage
   */
  const getProfileCompletion = useCallback(
    (userData: any): number => {
      const items = getProfileCompletionItems(userData);
      return calculateProfileCompletion(items);
    },
    [getProfileCompletionItems]
  );

  // Get current step index
  const currentStepIndex = currentStep
    ? flow.steps.findIndex(s => s.id === currentStep.id)
    : -1;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === flow.steps.length - 1;

  // Get overall progress
  const allStepIds = getAllStepIds(flow);
  const progress = getOnboardingProgress(allStepIds);
  const complete = isOnboardingComplete(allStepIds);

  return {
    // State
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: flow.steps.length,
    isFirstStep,
    isLastStep,
    progress,
    complete,
    state,
    flow,

    // Actions
    startOnboarding,
    completeStep,
    previousStep,
    skip,
    reset,

    // Helpers
    shouldShowTooltip,
    markFeatureSeen,
    getProfileCompletionItems,
    getProfileCompletion,
    updateProfileCompletion,
  };
}

export default useOnboarding;
