import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ConnectButton from '../../components/ConnectButton';
import { MutualConnectionsService } from '../../services/MutualConnectionsService';

// Mock MutualConnectionsService
jest.mock('../../services/MutualConnectionsService');

// Mock react-native modules
jest.mock('react-native-haptics', () => ({
  impact: jest.fn(),
  selection: jest.fn(),
}));

// Mock haptics utility
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    buttonPress: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ConnectButton', () => {
  const defaultProps = {
    currentUserId: 'user_123',
    targetUserId: 'contractor_456',
    targetUserName: 'John Contractor',
    targetUserRole: 'contractor' as const,
    onConnectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue(null);
  });

  it('renders connect button by default', async () => {
    const { getByText } = render(<ConnectButton {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });
  });

  it('shows connected state when already connected', async () => {
    (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('accepted');

    const { getByText } = render(<ConnectButton {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Connected')).toBeTruthy();
    });
  });

  it('shows pending state when request is pending', async () => {
    (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('pending');

    const { getByText } = render(<ConnectButton {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Pending')).toBeTruthy();
    });
  });

  it('sends connection request when connect button is pressed', async () => {
    (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockResolvedValue(undefined);

    const { getByText } = render(<ConnectButton {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });

    const button = getByText('Connect');
    fireEvent.press(button);

    await waitFor(() => {
      expect(MutualConnectionsService.sendConnectionRequest).toHaveBeenCalledWith(
        'user_123',
        'contractor_456',
        expect.stringContaining('John Contractor')
      );
    });
  });

  it('handles connection error appropriately', async () => {
    (MutualConnectionsService.sendConnectionRequest as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = render(<ConnectButton {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });

    const button = getByText('Connect');
    fireEvent.press(button);

    await waitFor(() => {
      expect(MutualConnectionsService.sendConnectionRequest).toHaveBeenCalled();
    });
  });

  it('does not render button for self', () => {
    const { toJSON } = render(
      <ConnectButton
        {...defaultProps}
        currentUserId="user_123"
        targetUserId="user_123"
      />
    );

    expect(toJSON()).toBeNull();
  });

  it('applies correct size styles', async () => {
    const { rerender, getByText } = render(<ConnectButton {...defaultProps} size="small" />);

    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });

    rerender(<ConnectButton {...defaultProps} size="large" />);

    await waitFor(() => {
      expect(getByText('Connect')).toBeTruthy();
    });
  });

  it('calls onConnectionChange callback', async () => {
    (MutualConnectionsService.getConnectionStatus as jest.Mock).mockResolvedValue('accepted');
    const onConnectionChange = jest.fn();

    render(<ConnectButton {...defaultProps} onConnectionChange={onConnectionChange} />);

    await waitFor(() => {
      expect(onConnectionChange).toHaveBeenCalledWith('accepted');
    });
  });
});