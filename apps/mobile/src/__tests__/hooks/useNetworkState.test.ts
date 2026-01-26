import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { render, act } from '../test-utils';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkState } from '../../hooks/useNetworkState';

// Mock NetInfo with NetInfoStateType enum
const NetInfoStateType = {
  wifi: 'wifi',
  cellular: 'cellular',
  ethernet: 'ethernet',
  bluetooth: 'bluetooth',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
  unknown: 'unknown',
  none: 'none',
};

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  NetInfoStateType,
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

const HookProbe = ({ onChange }: { onChange: (state: ReturnType<typeof useNetworkState>) => void }) => {
  const state = useNetworkState();

  useEffect(() => {
    onChange(state);
  }, [onChange, state]);

  return React.createElement(Text, { testID: 'network-state' }, JSON.stringify(state));
};

describe('useNetworkState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: NetInfoStateType.wifi,
    } as any);
  });

  it('initializes with default values and fetches initial state', async () => {
    const onChange = jest.fn();
    render(React.createElement(HookProbe, { onChange }));

    const latestState = onChange.mock.calls.at(-1)?.[0];
    expect(latestState.isConnected).toBe(true);
    expect(latestState.isOnline).toBe(true);
    expect(mockNetInfo.fetch).toHaveBeenCalled();
  });

  it('updates state when network changes', () => {
    let networkListener: (state: unknown) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn(); // unsubscribe function
    });

    const onChange = jest.fn();
    render(React.createElement(HookProbe, { onChange }));

    // Simulate network change to cellular
    act(() => {
      networkListener!({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.cellular,
        details: { cellularGeneration: '4g' },
      });
    });

    const latestState = onChange.mock.calls.at(-1)?.[0];
    expect(latestState.type).toBe(NetInfoStateType.cellular);
    expect(latestState.isCellular).toBe(true);
    expect(latestState.isWifi).toBe(false);
    expect(latestState.connectionQuality).toBe('good');
  });

  it('detects offline state correctly', () => {
    let networkListener: (state: unknown) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const onChange = jest.fn();
    render(React.createElement(HookProbe, { onChange }));

    // Simulate going offline
    act(() => {
      networkListener!({
        isConnected: false,
        isInternetReachable: false,
        type: NetInfoStateType.none,
      });
    });

    const latestState = onChange.mock.calls.at(-1)?.[0];
    expect(latestState.isConnected).toBe(false);
    expect(latestState.isOnline).toBe(false);
    expect(latestState.connectionQuality).toBe('offline');
  });

  it('detects slow connection correctly', () => {
    let networkListener: (state: unknown) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const onChange = jest.fn();
    render(React.createElement(HookProbe, { onChange }));

    // Simulate 3G connection
    act(() => {
      networkListener!({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.cellular,
        details: { cellularGeneration: '3g' },
      });
    });

    const latestState = onChange.mock.calls.at(-1)?.[0];
    expect(latestState.isCellular).toBe(true);
    expect(latestState.isSlowConnection).toBe(true);
    expect(latestState.connectionQuality).toBe('poor');
  });

  it('detects excellent WiFi connection', () => {
    let networkListener: (state: unknown) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const onChange = jest.fn();
    render(React.createElement(HookProbe, { onChange }));

    // Simulate WiFi connection
    act(() => {
      networkListener!({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.wifi,
      });
    });

    const latestState = onChange.mock.calls.at(-1)?.[0];
    expect(latestState.isWifi).toBe(true);
    expect(latestState.isCellular).toBe(false);
    expect(latestState.isSlowConnection).toBe(false);
    expect(latestState.connectionQuality).toBe('excellent');
  });

  it('handles 5G connection as excellent', () => {
    let networkListener: (state: unknown) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const onChange = jest.fn();
    render(React.createElement(HookProbe, { onChange }));

    // Simulate 5G connection
    act(() => {
      networkListener!({
        isConnected: true,
        isInternetReachable: true,
        type: NetInfoStateType.cellular,
        details: { cellularGeneration: '5g' },
      });
    });

    const latestState = onChange.mock.calls.at(-1)?.[0];
    expect(latestState.isCellular).toBe(true);
    expect(latestState.isSlowConnection).toBe(false);
    expect(latestState.connectionQuality).toBe('excellent');
  });

  it('cleans up event listener on unmount', () => {
    const unsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(unsubscribe);

    const onChange = jest.fn();
    const { unmount } = render(React.createElement(HookProbe, { onChange }));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
