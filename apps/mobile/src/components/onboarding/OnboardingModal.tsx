/**
 * OnboardingModal — full-screen modal that shows intro slides on first launch.
 *
 * Non-forced: user can skip at any time. Never shows again after dismiss.
 * Uses OnboardingSwiper with role-specific slides.
 */

import React from 'react';
import { Modal } from 'react-native';
import {
  OnboardingSwiper,
  homeownerSlides,
  contractorSlides,
  teamMemberSlides,
} from './OnboardingSwiper';

interface OnboardingModalProps {
  visible: boolean;
  userRole: string;
  audience?: string | null;
  onDismiss: () => void;
  onComplete?: () => void;
}

export function OnboardingModal({
  visible,
  userRole,
  audience,
  onDismiss,
  onComplete,
}: OnboardingModalProps) {
  if (!visible || !['homeowner', 'contractor'].includes(userRole)) return null;

  const slides =
    audience === 'team-member'
      ? teamMemberSlides
      : userRole === 'contractor'
        ? contractorSlides
        : homeownerSlides;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='fullScreen'
      onRequestClose={onDismiss}
    >
      <OnboardingSwiper
        slides={slides}
        userType={userRole === 'contractor' ? 'contractor' : 'homeowner'}
        onComplete={onComplete ?? onDismiss}
        onSkip={onDismiss}
      />
    </Modal>
  );
}
