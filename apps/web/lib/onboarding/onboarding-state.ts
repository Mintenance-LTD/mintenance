/**
 * Onboarding State Management
 * Tracks user progress through onboarding flows and everboarding features
 */

export interface OnboardingState {
  completedSteps: string[];
  currentStep: string | null;
  profileCompletion: number; // 0-100%
  hasSeenFeature: { [key: string]: boolean };
  dismissedTips: string[];
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
}

export interface ProfileCompletionItem {
  id: string;
  label: string;
  weight: number; // Contribution to overall completion %
  completed: boolean;
  action: string; // Route or action to complete this item
}

const STORAGE_KEY = 'mintenance_onboarding_state';

/**
 * Get current onboarding state from localStorage
 */
export function getOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') {
    return getDefaultState();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse onboarding state:', error);
  }

  return getDefaultState();
}

/**
 * Save onboarding state to localStorage
 */
export function saveOnboardingState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save onboarding state:', error);
  }
}

/**
 * Get default onboarding state
 */
function getDefaultState(): OnboardingState {
  return {
    completedSteps: [],
    currentStep: null,
    profileCompletion: 0,
    hasSeenFeature: {},
    dismissedTips: [],
  };
}

/**
 * Mark a step as complete
 */
export function markStepComplete(stepId: string): OnboardingState {
  const state = getOnboardingState();

  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId);
  }

  // Auto-advance to next step if in flow
  if (state.currentStep === stepId) {
    state.currentStep = null;
  }

  saveOnboardingState(state);
  return state;
}

/**
 * Set current step
 */
export function setCurrentStep(stepId: string | null): OnboardingState {
  const state = getOnboardingState();
  state.currentStep = stepId;

  if (stepId && !state.startedAt) {
    state.startedAt = new Date().toISOString();
  }

  saveOnboardingState(state);
  return state;
}

/**
 * Get next step in a flow
 */
export function getNextStep(flowSteps: string[]): string | null {
  const state = getOnboardingState();

  for (const stepId of flowSteps) {
    if (!state.completedSteps.includes(stepId)) {
      return stepId;
    }
  }

  return null; // All steps completed
}

/**
 * Calculate profile completion percentage based on completed items
 */
export function calculateProfileCompletion(
  items: ProfileCompletionItem[]
): number {
  if (items.length === 0) return 0;

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items
    .filter(item => item.completed)
    .reduce((sum, item) => sum + item.weight, 0);

  return Math.round((completedWeight / totalWeight) * 100);
}

/**
 * Update profile completion percentage
 */
export function updateProfileCompletion(percentage: number): OnboardingState {
  const state = getOnboardingState();
  state.profileCompletion = Math.min(100, Math.max(0, percentage));

  if (state.profileCompletion === 100 && !state.completedAt) {
    state.completedAt = new Date().toISOString();
  }

  saveOnboardingState(state);
  return state;
}

/**
 * Check if a feature tooltip should be shown
 */
export function shouldShowTooltip(
  featureId: string,
  options?: {
    maxDismissals?: number;
    requireCompletion?: number; // Min profile completion %
  }
): boolean {
  const state = getOnboardingState();

  // Already seen this feature
  if (state.hasSeenFeature[featureId]) {
    return false;
  }

  // Dismissed too many times
  const dismissCount = state.dismissedTips.filter(id => id === featureId).length;
  if (options?.maxDismissals && dismissCount >= options.maxDismissals) {
    return false;
  }

  // Profile not complete enough
  if (options?.requireCompletion && state.profileCompletion < options.requireCompletion) {
    return false;
  }

  return true;
}

/**
 * Mark a feature as seen
 */
export function markFeatureSeen(featureId: string): OnboardingState {
  const state = getOnboardingState();
  state.hasSeenFeature[featureId] = true;
  saveOnboardingState(state);
  return state;
}

/**
 * Dismiss a tooltip/tip
 */
export function dismissTip(featureId: string): OnboardingState {
  const state = getOnboardingState();
  state.dismissedTips.push(featureId);
  saveOnboardingState(state);
  return state;
}

/**
 * Skip entire onboarding
 */
export function skipOnboarding(): OnboardingState {
  const state = getOnboardingState();
  state.skippedAt = new Date().toISOString();
  state.currentStep = null;
  saveOnboardingState(state);
  return state;
}

/**
 * Reset onboarding state (for testing or re-onboarding)
 */
export function resetOnboarding(): OnboardingState {
  const state = getDefaultState();
  saveOnboardingState(state);
  return state;
}

/**
 * Check if onboarding is complete
 */
export function isOnboardingComplete(flowSteps: string[]): boolean {
  const state = getOnboardingState();
  return flowSteps.every(stepId => state.completedSteps.includes(stepId));
}

/**
 * Get onboarding progress (0-1)
 */
export function getOnboardingProgress(flowSteps: string[]): number {
  const state = getOnboardingState();
  const completed = flowSteps.filter(stepId =>
    state.completedSteps.includes(stepId)
  ).length;
  return flowSteps.length > 0 ? completed / flowSteps.length : 0;
}
