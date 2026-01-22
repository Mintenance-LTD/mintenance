
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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
      acceptCall: jest.fn(),
      declineCall: jest.fn(),
    }),
  },
}));

import React from 'react';
import VideoCallMessage from '../VideoCallMessage';

describe('VideoCallMessage', () => {
  it('exports the component', () => {
    expect(VideoCallMessage).toBeDefined();
    expect(typeof VideoCallMessage).toBe('function');
  });
});
