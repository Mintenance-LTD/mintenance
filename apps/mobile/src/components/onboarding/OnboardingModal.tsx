/**
 * OnboardingModal — full-screen modal that shows intro slides on first launch.
 *
 * Non-forced: user can skip at any time. Never shows again after dismiss.
 * Uses OnboardingSwiper with role-specific slides.
 */

import React from 'react';
import { Modal } from 'react-native';
import { OnboardingSwiper, homeownerSlides, contractorSlides } from './OnboardingSwiper';

interface OnboardingModalProps {
  visible: boolean;
  userRole: string;
  onDismiss: () => void;
}

export function OnboardingModal({ visible, userRole, onDismiss }: OnboardingModalProps) {
  if (!visible) return null;

  const slides = userRole === 'contractor' ? contractorSlides : homeownerSlides;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <OnboardingSwiper
        slides={slides}
        userType={userRole === 'contractor' ? 'contractor' : 'homeowner'}
        onComplete={onDismiss}
        onSkip={onDismiss}
      />
    </Modal>
  );
}
