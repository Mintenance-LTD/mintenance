import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};

export const getConnectionType = async (): Promise<string> => {
  const state = await NetInfo.fetch();
  return state.type;
};

export const onNetworkChange = (callback: (state: NetInfoState) => void): (() => void) => {
  return NetInfo.addEventListener(callback);
};

export const withNetworkCheck = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  const online = await isOnline();
  if (!online) {
    throw new Error('No network connection');
  }
  return apiCall();
};