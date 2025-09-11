import React from 'react';
import { renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkState } from '../../hooks/useNetworkState';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

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
    const { result } = renderHook(() => useNetworkState());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isOnline).toBe(true);
    expect(mockNetInfo.fetch).toHaveBeenCalled();
  });

  it('updates state when network changes', () => {
    let networkListener: (state: any) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn(); // unsubscribe function
    });

    const { result } = renderHook(() => useNetworkState());

    // Simulate network change to cellular
    networkListener!({
      isConnected: true,
      isInternetReachable: true,
      type: NetInfoStateType.cellular,
      details: { cellularGeneration: '4g' },
    });

    expect(result.current.type).toBe(NetInfoStateType.cellular);
    expect(result.current.isCellular).toBe(true);
    expect(result.current.isWifi).toBe(false);
    expect(result.current.connectionQuality).toBe('good');
  });

  it('detects offline state correctly', () => {
    let networkListener: (state: any) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkState());

    // Simulate going offline
    networkListener!({
      isConnected: false,
      isInternetReachable: false,
      type: NetInfoStateType.none,
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isOnline).toBe(false);
    expect(result.current.connectionQuality).toBe('offline');
  });

  it('detects slow connection correctly', () => {
    let networkListener: (state: any) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkState());

    // Simulate 3G connection
    networkListener!({
      isConnected: true,
      isInternetReachable: true,
      type: NetInfoStateType.cellular,
      details: { cellularGeneration: '3g' },
    });

    expect(result.current.isCellular).toBe(true);
    expect(result.current.isSlowConnection).toBe(true);
    expect(result.current.connectionQuality).toBe('poor');
  });

  it('detects excellent WiFi connection', () => {
    let networkListener: (state: any) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkState());

    // Simulate WiFi connection
    networkListener!({
      isConnected: true,
      isInternetReachable: true,
      type: NetInfoStateType.wifi,
    });

    expect(result.current.isWifi).toBe(true);
    expect(result.current.isCellular).toBe(false);
    expect(result.current.isSlowConnection).toBe(false);
    expect(result.current.connectionQuality).toBe('excellent');
  });

  it('handles 5G connection as excellent', () => {
    let networkListener: (state: any) => void;
    mockNetInfo.addEventListener.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useNetworkState());

    // Simulate 5G connection
    networkListener!({
      isConnected: true,
      isInternetReachable: true,
      type: NetInfoStateType.cellular,
      details: { cellularGeneration: '5g' },
    });

    expect(result.current.isCellular).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
    expect(result.current.connectionQuality).toBe('excellent');
  });

  it('cleans up event listener on unmount', () => {
    const unsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkState());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});