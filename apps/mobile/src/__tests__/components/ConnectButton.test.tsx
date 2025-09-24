import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ConnectButton } from '../../components/ConnectButton';

// Mock react-native modules
jest.mock('react-native-haptics', () => ({
  impact: jest.fn(),
  selection: jest.fn(),
}));

// Mock haptics utility
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock i18n
jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    connections: {
      connect: () => 'Connect',
      connecting: () => 'Connecting...',
      connected: () => 'Connected',
      disconnect: () => 'Disconnect',
      retry: () => 'Retry',
    },
  }),
}));

describe('ConnectButton', () => {
  const defaultProps = {
    userId: 'user_123',
    contractorId: 'contractor_456',
    onConnectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connect button by default', () => {
    const { getByText, getByTestId } = render(<ConnectButton {...defaultProps} />);

    expect(getByText('Connect')).toBeTruthy();
    expect(getByTestId('connect-button')).toBeTruthy();
  });

  it('shows connecting state when pressed', async () => {
    const { getByText, getByTestId } = render(<ConnectButton {...defaultProps} />);

    const button = getByTestId('connect-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Connecting...')).toBeTruthy();
    });
  });

  it('shows connected state after successful connection', async () => {
    const onConnectionChange = jest.fn().mockResolvedValue(true);
    const { getByText, getByTestId } = render(
      <ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />
    );

    const button = getByTestId('connect-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Connected')).toBeTruthy();
    });

    expect(onConnectionChange).toHaveBeenCalledWith('user_123', 'contractor_456', true);
  });

  it('shows retry button after failed connection', async () => {
    const onConnectionChange = jest.fn().mockRejectedValue(new Error('Connection failed'));
    const { getByText, getByTestId } = render(
      <ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />
    );

    const button = getByTestId('connect-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Retry')).toBeTruthy();
    });
  });

  it('handles disconnect functionality', async () => {
    const onConnectionChange = jest.fn().mockResolvedValue(false);
    const { getByText, getByTestId, rerender } = render(
      <ConnectButton {...defaultProps} initialConnectionStatus={true} />
    );

    // Should show disconnect button when already connected
    expect(getByText('Disconnect')).toBeTruthy();

    const button = getByTestId('connect-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(onConnectionChange).toHaveBeenCalledWith('user_123', 'contractor_456', false);
    });
  });

  it('is disabled when loading', async () => {
    const onConnectionChange = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(true), 1000))
    );

    const { getByTestId } = render(
      <ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />
    );

    const button = getByTestId('connect-button');
    fireEvent.press(button);

    // Button should be disabled while loading
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('handles missing props gracefully', () => {
    const { getByTestId } = render(
      <ConnectButton userId="" contractorId="" onConnectionChange={jest.fn()} />
    );

    expect(getByTestId('connect-button')).toBeTruthy();
  });

  it('applies correct accessibility labels', () => {
    const { getByTestId } = render(<ConnectButton {...defaultProps} />);

    const button = getByTestId('connect-button');
    expect(button.props.accessibilityLabel).toBe('Connect with contractor');
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('handles rapid successive presses gracefully', async () => {
    const onConnectionChange = jest.fn().mockResolvedValue(true);
    const { getByTestId } = render(
      <ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />
    );

    const button = getByTestId('connect-button');

    // Rapid fire multiple presses
    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);

    await waitFor(() => {
      // Should only be called once due to loading state protection
      expect(onConnectionChange).toHaveBeenCalledTimes(1);
    });
  });

  it('updates UI correctly based on initialConnectionStatus prop', () => {
    const { getByText } = render(
      <ConnectButton {...defaultProps} initialConnectionStatus={true} />
    );

    expect(getByText('Disconnect')).toBeTruthy();
  });

  it('handles network errors appropriately', async () => {
    const networkError = new Error('Network request failed');
    const onConnectionChange = jest.fn().mockRejectedValue(networkError);

    const { getByText, getByTestId } = render(
      <ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />
    );

    const button = getByTestId('connect-button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Retry')).toBeTruthy();
    });
  });
});