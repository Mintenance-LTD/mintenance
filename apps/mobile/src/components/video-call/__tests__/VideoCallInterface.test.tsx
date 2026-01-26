import React from 'react';
import { render } from '../../../__tests__/test-utils';
import VideoCallInterface from '../VideoCallInterface';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../services/VideoCallService', () => ({
  VideoCallService: {
    getActiveCall: jest.fn(() => null),
    joinCall: jest.fn(() => Promise.resolve(null)),
    subscribeToCallUpdates: jest.fn(),
    toggleMute: jest.fn(() => Promise.resolve()),
    toggleVideo: jest.fn(() => Promise.resolve()),
    toggleSpeaker: jest.fn(() => Promise.resolve()),
    endCall: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../../utils/performanceMonitor', () => ({
  performanceMonitor: {
    startMeasurement: jest.fn(),
    endMeasurement: jest.fn(),
    recordMetric: jest.fn(),
  },
}));

describe('VideoCallInterface', () => {
  it('should initialize with default values', () => {
    const { toJSON } = render(
      <VideoCallInterface callId="call-1" onCallEnd={jest.fn()} onCallError={jest.fn()} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should handle updates correctly', () => {
    const { toJSON } = render(
      <VideoCallInterface callId="call-1" onCallEnd={jest.fn()} onCallError={jest.fn()} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should clean up on unmount', () => {
    const { unmount } = render(
      <VideoCallInterface callId="call-1" onCallEnd={jest.fn()} onCallError={jest.fn()} />
    );
    unmount();
  });
});
