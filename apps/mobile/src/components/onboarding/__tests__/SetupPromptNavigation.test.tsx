import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ServiceAreaPromptModal } from '../ServiceAreaPromptModal';
import { IdentitySetupPromptModal } from '../IdentitySetupPromptModal';
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
it.each([
  [ServiceAreaPromptModal, 'Set up service area', 'ServiceAreas'],
  [IdentitySetupPromptModal, 'Start verification', 'ContractorVerification'],
] as const)('opens the setup destination and releases the prompt overlay (%s)', (Component, label, screen) => {
  const dismiss = jest.fn();
  const pause = jest.fn();
  const view = render(<Component visible onDismiss={dismiss} onAfterNavigate={pause} />);
  fireEvent.press(view.getByLabelText(label));
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(pause).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('Main', {
    screen: 'BusinessTab', params: { screen, initial: false },
  });
});
