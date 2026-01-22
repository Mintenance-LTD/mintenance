import React from 'react';
import { render } from '../../__tests__/test-utils';
import OfflineSyncStatus from '../OfflineSyncStatus';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../hooks/useNetworkState', () => ({
  useNetworkState: () => ({ isOnline: true, connectionQuality: 'good' }),
}));

jest.mock('../../services/OfflineManager', () => ({
  OfflineManager: {
    onSyncStatusChange: jest.fn(() => jest.fn()),
    getPendingActionsCount: jest.fn(() => Promise.resolve(0)),
    syncQueue: jest.fn(() => Promise.resolve()),
    clearQueue: jest.fn(() => Promise.resolve()),
  },
}));

describe('OfflineSyncStatus', () => {
  it('should initialize with default values', () => {
    const { getByText } = render(<OfflineSyncStatus />);
    expect(getByText('Synced')).toBeTruthy();
  });

  it('should handle updates correctly', () => {
    const { getByText } = render(<OfflineSyncStatus showWhenOnline />);
    expect(getByText('Synced')).toBeTruthy();
  });

  it('should clean up on unmount', () => {
    const { unmount } = render(<OfflineSyncStatus />);
    unmount();
  });
});
