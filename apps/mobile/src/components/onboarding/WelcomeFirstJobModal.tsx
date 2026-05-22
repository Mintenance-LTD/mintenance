/**
 * WelcomeFirstJobModal — fullscreen wrapper for WelcomeFirstJobScreen
 * (final onboarding screen, see mobile-auth.html screen 10).
 *
 * Lives at the bottom of the OnboardingGateStack priority chain so it
 * only renders once every earlier tier (intro swiper, permission
 * soft-asks, role-specific setup) has either fired or been dismissed.
 */

import React from 'react';
import { Modal } from 'react-native';
import { WelcomeFirstJobScreen } from '../../screens/auth/WelcomeFirstJobScreen';

interface WelcomeFirstJobModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const WelcomeFirstJobModal: React.FC<WelcomeFirstJobModalProps> = ({
  visible,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='fullScreen'
      onRequestClose={onDismiss}
    >
      <WelcomeFirstJobScreen onComplete={onDismiss} />
    </Modal>
  );
};
