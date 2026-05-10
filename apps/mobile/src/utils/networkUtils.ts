import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
};

export const getConnectionType = async (): Promise<string> => {
  const state = await NetInfo.fetch();
  return state.type;
};

export const onNetworkChange = (
  callback: (state: NetInfoState) => void
): (() => void) => {
  return NetInfo.addEventListener(callback);
};

export const withNetworkCheck = async <T>(
  apiCall: () => Promise<T>
): Promise<T> => {
  const online = await isOnline();
  if (!online) {
    throw new Error('No network connection');
  }
  return apiCall();
};

// 2026-05-09: cached online flag. Several sync error-message helpers
// (serviceErrorHandler, ErrorManager, errorHandler, HealthCheckManager)
// previously read `navigator.onLine`, which is `undefined` in React
// Native and therefore always falsy — so every "network error" branch
// reported "No internet connection" regardless of actual state. The
// cache is seeded by `NetInfo.addEventListener` on first read and
// kept warm for the life of the app, so callers can branch on it
// synchronously without paying for an async fetch on every error.
let cachedOnline: boolean = true;
let onlineListenerInstalled = false;

const installOnlineListener = (): void => {
  if (onlineListenerInstalled) return;
  onlineListenerInstalled = true;
  NetInfo.addEventListener((state) => {
    cachedOnline = !!(state.isConnected && state.isInternetReachable);
  });
  // Seed the cache asynchronously without blocking the caller.
  NetInfo.fetch()
    .then((state) => {
      cachedOnline = !!(state.isConnected && state.isInternetReachable);
    })
    .catch(() => {
      // If NetInfo can't read state, leave optimistic default (true).
    });
};

export const isOnlineCached = (): boolean => {
  installOnlineListener();
  return cachedOnline;
};
