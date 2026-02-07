
import React from 'react';
import VideoCallScheduler from '../VideoCallScheduler';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    signIn: jest.fn(),
    signOut: jest.fn(),
    loading: false,
  }),
}));

jest.mock('../../../services/VideoCallService', () => ({
  VideoCallService: {
    getInstance: () => ({
      scheduleCall: jest.fn().mockResolvedValue({ id: 'call-123' }),
    }),
  },
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('View', { testID: 'date-time-picker' }),
  };
});

describe('VideoCallScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exports the component', () => {
    expect(VideoCallScheduler).toBeDefined();
    expect(typeof VideoCallScheduler).toBe('function');
  });
});
