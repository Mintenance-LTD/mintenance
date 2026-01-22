
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import BiometricLoginButton from '../../../components/BiometricLoginButton';
import { BiometricService } from '../../../services/BiometricService';

jest.mock('../../../services/BiometricService', () => ({
  BiometricService: {
    isAvailable: jest.fn(),
    isBiometricEnabled: jest.fn(),
    getSupportedTypes: jest.fn(),
    getTypeDisplayName: jest.fn(),
  },
}));

const mockSignInWithBiometrics = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signInWithBiometrics: mockSignInWithBiometrics,
  }),
}));

describe('Biometric Authentication - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithBiometrics.mockReset();
  });

  it('should check biometric availability', async () => {
    jest.mocked(BiometricService.isAvailable).mockResolvedValue(true);
    jest.mocked(BiometricService.isBiometricEnabled).mockResolvedValue(true);
    jest.mocked(BiometricService.getSupportedTypes).mockResolvedValue([1]);
    jest.mocked(BiometricService.getTypeDisplayName).mockReturnValue('Fingerprint');

    const { getByText } = render(
      <BiometricLoginButton onSuccess={jest.fn()} />
    );

    await waitFor(() => {
      expect(getByText('Quick Sign In')).toBeTruthy();
      expect(getByText('Use Fingerprint')).toBeTruthy();
    });
  });

  it('should authenticate with biometrics', async () => {
    jest.mocked(BiometricService.isAvailable).mockResolvedValue(true);
    jest.mocked(BiometricService.isBiometricEnabled).mockResolvedValue(true);
    jest.mocked(BiometricService.getSupportedTypes).mockResolvedValue([1]);
    jest.mocked(BiometricService.getTypeDisplayName).mockReturnValue('Fingerprint');
    mockSignInWithBiometrics.mockResolvedValue(undefined);

    const onSuccess = jest.fn();
    const { getByText } = render(<BiometricLoginButton onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(getByText('Use Fingerprint')).toBeTruthy();
    });
    fireEvent.press(getByText('Use Fingerprint'));

    await waitFor(() => {
      expect(mockSignInWithBiometrics).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should handle biometric failure', async () => {
    jest.mocked(BiometricService.isAvailable).mockResolvedValue(true);
    jest.mocked(BiometricService.isBiometricEnabled).mockResolvedValue(true);
    jest.mocked(BiometricService.getSupportedTypes).mockResolvedValue([1]);
    jest.mocked(BiometricService.getTypeDisplayName).mockReturnValue('Fingerprint');
    mockSignInWithBiometrics.mockRejectedValue(new Error('Sensor error'));

    const onError = jest.fn();
    const { getByText } = render(
      <BiometricLoginButton onSuccess={jest.fn()} onError={onError} />
    );

    await waitFor(() => {
      expect(getByText('Use Fingerprint')).toBeTruthy();
    });
    fireEvent.press(getByText('Use Fingerprint'));

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should fallback to password on biometric unavailability', async () => {
    jest.mocked(BiometricService.isAvailable).mockResolvedValue(false);
    jest.mocked(BiometricService.isBiometricEnabled).mockResolvedValue(false);

    const { queryByText } = render(<BiometricLoginButton onSuccess={jest.fn()} />);

    await waitFor(() => {
      expect(queryByText('Quick Sign In')).toBeNull();
    });
  });
});
