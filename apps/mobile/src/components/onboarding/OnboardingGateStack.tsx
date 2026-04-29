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
 *   5. BackgroundCheckPromptModal (contractor, PDF §5.3 step 6)
 *   6. SelfieCapturePromptModal   (contractor, PDF §5.3 step 7)
 *   7. PushSoftAskModal       — any role, last Tier 1 gate
 *   8. StripeConnectPromptModal (contractor, Tier 2 — post-first-
 *      winning-bid money moment, PDF §5.3 Tier 2)
 *   9. AlwaysLocationSoftAskModal (contractor, Tier 2 — post-
 *      first-assigned-job, PDF §5.4 "Always" permission)
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
import { useStripeConnectPromptGate } from '../../hooks/useStripeConnectPromptGate';
import { useAlwaysLocationSoftAskGate } from '../../hooks/useAlwaysLocationSoftAskGate';
import { OnboardingModal } from './OnboardingModal';
import { PushSoftAskModal } from './PushSoftAskModal';
import { FirstPropertyPromptModal } from './FirstPropertyPromptModal';
import { LocationSoftAskModal } from './LocationSoftAskModal';
import { ServiceAreaPromptModal } from './ServiceAreaPromptModal';
import { IdentitySetupPromptModal } from './IdentitySetupPromptModal';
import { BackgroundCheckPromptModal } from './BackgroundCheckPromptModal';
import { SelfieCapturePromptModal } from './SelfieCapturePromptModal';
import { StripeConnectPromptModal } from './StripeConnectPromptModal';
import { AlwaysLocationSoftAskModal } from './AlwaysLocationSoftAskModal';

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
  const stripeConnect = useStripeConnectPromptGate();
  const alwaysLocation = useAlwaysLocationSoftAskGate();

  // Pre-compute the stacking conditions so the JSX below stays
  // readable. Each lower tier checks its own condition AND that
  // no higher-priority gate is currently visible.
  //
  // Push soft-ask was promoted from #7 (last Tier 1) to #2 here on
  // 2026-04-28 after a live audit found `user_push_tokens = 0` in
  // prod despite the modal being mounted. The root cause was that
  // role-specific gates above it (FirstProperty / LocationSoftAsk /
  // ServiceArea / IdentitySetup / BackgroundCheck / SelfieCapture)
  // suppressed push indefinitely for users who never finished those
  // flows — e.g. a homeowner who hasn't added a property would never
  // see the push prompt because FirstProperty took precedence
  // forever. Push is role-agnostic and unlocks the highest-value
  // re-engagement signal, so it earns the slot immediately after
  // the swiper.
  const showOnboarding = onboarding.shouldShow;
  const showPushSoftAsk = !showOnboarding && pushSoftAsk.shouldShow;
  const showFirstProperty =
    !showOnboarding && !showPushSoftAsk && firstProperty.shouldShow;
  const showLocationSoftAsk =
    !showOnboarding && !showPushSoftAsk && locationSoftAsk.shouldShow;
  const showServiceArea =
    !showOnboarding &&
    !showPushSoftAsk &&
    !showLocationSoftAsk &&
    serviceArea.shouldShow;
  const showIdentitySetup =
    !showOnboarding &&
    !showPushSoftAsk &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    identitySetup.shouldShow;
  const showBackgroundCheck =
    !showOnboarding &&
    !showPushSoftAsk &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    !showIdentitySetup &&
    backgroundCheck.shouldShow;
  const showSelfieCapture =
    !showOnboarding &&
    !showPushSoftAsk &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    !showIdentitySetup &&
    !showBackgroundCheck &&
    selfieCapture.shouldShow;
  // Tier 2 — contractor post-first-winning-bid money moment.
  // Deliberately positioned after all Tier 1 gates so a fresh
  // contractor who somehow wins a bid mid-intro doesn't get
  // Stripe thrown at them while the swiper is still open.
  const showStripeConnect =
    !showOnboarding &&
    !showFirstProperty &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    !showIdentitySetup &&
    !showBackgroundCheck &&
    !showSelfieCapture &&
    !showPushSoftAsk &&
    stripeConnect.shouldShow;
  // Tier 2 — contractor post-first-assigned-job "Always" location
  // ask. Sits below StripeConnect because a contractor whose first
  // bid just won (Stripe trigger) may not yet have the job set to
  // 'assigned' by the bid-acceptance pipeline; this gate waits
  // for the actual live job before asking for background tracking.
  const showAlwaysLocation =
    !showOnboarding &&
    !showFirstProperty &&
    !showLocationSoftAsk &&
    !showServiceArea &&
    !showIdentitySetup &&
    !showBackgroundCheck &&
    !showSelfieCapture &&
    !showPushSoftAsk &&
    !showStripeConnect &&
    alwaysLocation.shouldShow;

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
      <StripeConnectPromptModal
        visible={showStripeConnect}
        onDismiss={stripeConnect.dismiss}
        onAfterNavigate={stripeConnect.refresh}
      />
      <AlwaysLocationSoftAskModal
        visible={showAlwaysLocation}
        permissionStatus={alwaysLocation.permissionStatus}
        onAllow={alwaysLocation.allowAlways}
        onDismiss={alwaysLocation.dismiss}
        onOpenSettings={alwaysLocation.openSystemSettings}
      />
    </>
  );
};
