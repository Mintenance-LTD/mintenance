/**
 * HomeownerSetupModal — fullscreen wrapper for HomeownerSetupScreen
 * so it can be orchestrated by OnboardingGateStack the same way
 * OnboardingModal / FirstPropertyPromptModal etc. are.
 *
 * The host screen captures property type + concern tags via
 * best-effort PATCH /api/users/profile; persistence is non-blocking.
 */

import React from 'react';
import { Modal } from 'react-native';
import { HomeownerSetupScreen } from '../../screens/auth/HomeownerSetupScreen';

interface HomeownerSetupModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const HomeownerSetupModal: React.FC<HomeownerSetupModalProps> = ({
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
      <HomeownerSetupScreen onComplete={onDismiss} />
    </Modal>
  );
};
