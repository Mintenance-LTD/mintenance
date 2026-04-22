/**
 * OnboardingGateStack — single entry point for every post-sign-in
 * onboarding nudge (intro swiper, permission soft-asks, first-
 * property / service-area prompts, identity + background-check
 * nudges).
 *
 * Extracted from AppNavigator on 2026-04-21 when the chain grew
 * to five gates and AppNavigator.tsx brushed against the 500-line
 * pre-commit ceiling. New Tier 1 gates belong here, not in the
 * navigator file.
 *
 * Suppression chain (only one modal ever visible at a time):
 *
 *   1. OnboardingModal        — any role, full-screen
 *   2. FirstPropertyPromptModal (homeowner only)
 *      OR
 *      LocationSoftAskModal   (contractor only)
 *   3. ServiceAreaPromptModal (contractor, after location)
 *   4. IdentitySetupPromptModal (contractor, PDF §5.3 step 5)
 *   5. PushSoftAskModal       — any role, last
 *
 * Homeowner and contractor variants at the same level are
 * mutually exclusive by role; each lower tier suppresses itself
 * while any higher tier is visible. The result is a single-
 * prompt experience regardless of role.
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboardingGate } from '../../hooks/useOnboardingGate';
import { usePushSoftAskGate } from '../../hooks/usePushSoftAskGate';
import { useFirstPropertyGate } from '../../hooks/useFirstPropertyGate';
import { useLocationSoftAskGate } from '../../hooks/useLocationSoftAskGate';
import { useServiceAreaGate } from '../../hooks/useServiceAreaGate';
import { useIdentitySetupGate } from '../../hooks/useIdentitySetupGate';
import { useBackgroundCheckGate } from '../../hooks/useBackgroundCheckGate';
import { useSelfieCaptureGate } from '../../hooks/useSelfieCaptureGate';
import { OnboardingModal } from './OnboardingModal';
import { PushSoftAskModal } from './PushSoftAskModal';
import { FirstPropertyPromptModal } from './FirstPropertyPromptModal';
import { LocationSoftAskModal } from './LocationSoftAskModal';
import { ServiceAreaPromptModal } from './ServiceAreaPromptModal';
import { IdentitySetupPromptModal } from './IdentitySetupPromptModal';
import { BackgroundCheckPromptModal } from './BackgroundCheckPromptModal';
import { SelfieCapturePromptModal } from './SelfieCapturePromptModal';

export const OnboardingGateStack: React.FC = () => {
  const { user } = useAuth();
  const onboarding = useOnboardingGate();
  const firstProperty = useFirstPropertyGate();
  const locationSoftAsk = useLocationSoftAskGate();
  const serviceArea = useServiceAreaGate();
  const identitySetup = useIdentitySetupGate();
  const backgroundCheck = useBackgroundCheckGate();
  const selfieCapture = useSelfieCaptureGate();
  const pushSoftAsk = usePushSoftAskGate();

  // Pre-compute the stacking conditions so the JSX below stays
  // readable. Each lower tier checks its own condition AND that
  // no higher-priority gate is currently visible.
  const showOnboarding = onboarding.shouldShow;
  const showFirstProperty = !showOnboarding && firstProperty.shouldShow;
  const showLocationSoftAsk = !showOnboarding && locationSoftAsk.shouldShow;
  const showServiceArea =
    !showOnboarding && !showLocationSoftAsk && serviceArea.shouldShow;
  const showIdentitySetup =
    !showOnboarding &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    identitySetup.shouldShow;
  const showBackgroundCheck =
    !showOnboarding &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    !showIdentitySetup &&
    backgroundCheck.shouldShow;
  const showSelfieCapture =
    !showOnboarding &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    !showIdentitySetup &&
    !showBackgroundCheck &&
    selfieCapture.shouldShow;
  const showPushSoftAsk =
    !showOnboarding &&
    !showFirstProperty &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    !showIdentitySetup &&
    !showBackgroundCheck &&
    !showSelfieCapture &&
    pushSoftAsk.shouldShow;

  return (
    <>
      <OnboardingModal
        visible={showOnboarding}
        userRole={user?.role || 'homeowner'}
        onDismiss={onboarding.dismiss}
      />
      <FirstPropertyPromptModal
        visible={showFirstProperty}
        onDismiss={firstProperty.dismiss}
        onAfterNavigate={firstProperty.refresh}
      />
      <LocationSoftAskModal
        visible={showLocationSoftAsk}
        permissionStatus={locationSoftAsk.permissionStatus}
        onAllow={locationSoftAsk.allowLocation}
        onDismiss={locationSoftAsk.dismiss}
        onOpenSettings={locationSoftAsk.openSystemSettings}
      />
      <ServiceAreaPromptModal
        visible={showServiceArea}
        onDismiss={serviceArea.dismiss}
        onAfterNavigate={serviceArea.refresh}
      />
      <IdentitySetupPromptModal
        visible={showIdentitySetup}
        onDismiss={identitySetup.dismiss}
        onAfterNavigate={identitySetup.refresh}
      />
      <BackgroundCheckPromptModal
        visible={showBackgroundCheck}
        onDismiss={backgroundCheck.dismiss}
        onAfterNavigate={backgroundCheck.refresh}
      />
      <SelfieCapturePromptModal
        visible={showSelfieCapture}
        onDismiss={selfieCapture.dismiss}
        onAfterNavigate={selfieCapture.refresh}
      />
      <PushSoftAskModal
        visible={showPushSoftAsk}
        permissionStatus={pushSoftAsk.permissionStatus}
        onAllow={pushSoftAsk.allowNotifications}
        onDismiss={pushSoftAsk.dismiss}
        onOpenSettings={pushSoftAsk.openSystemSettings}
      />
    </>
  );
};
