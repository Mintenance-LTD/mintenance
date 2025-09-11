import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '../utils/logger';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: NetInfoState['type'];
  isWifi: boolean;
  isCellular: boolean;
  isSlowConnection: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export const useNetworkState = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    isWifi: false,
    isCellular: false,
    isSlowConnection: false,
    connectionQuality: 'good',
  });

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable ?? false;
      const type = state.type;
      const isWifi = type === 'wifi';
      const isCellular = type === 'cellular';

      // Determine connection quality based on type and details
      let connectionQuality: NetworkState['connectionQuality'] = 'offline';
      let isSlowConnection = false;

      if (isConnected && isInternetReachable) {
        if (isWifi) {
          connectionQuality = 'excellent';
        } else if (isCellular) {
          // Check cellular generation if available
          const cellularGeneration = (state.details as any)?.cellularGeneration;
          switch (cellularGeneration) {
            case '5g':
              connectionQuality = 'excellent';
              break;
            case '4g':
              connectionQuality = 'good';
              break;
            case '3g':
              connectionQuality = 'poor';
              isSlowConnection = true;
              break;
            case '2g':
              connectionQuality = 'poor';
              isSlowConnection = true;
              break;
            default:
              connectionQuality = 'good';
          }
        } else {
          connectionQuality = 'good';
        }
      }

      const newNetworkState: NetworkState = {
        isConnected,
        isInternetReachable,
        type,
        isWifi,
        isCellular,
        isSlowConnection,
        connectionQuality,
      };

      setNetworkState(newNetworkState);
      setIsOnline(isConnected && isInternetReachable);

      // Log network state changes
      logger.network(
        'NETWORK_STATE',
        `${type}${isConnected ? ' (connected)' : ' (disconnected)'}`,
        isConnected ? 200 : 0,
        0,
        {
          connectionQuality,
          isSlowConnection,
          isWifi,
          isCellular,
        }
      );
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable ?? false;
      setIsOnline(isConnected && isInternetReachable);
    });

    return unsubscribe;
  }, []);

  return {
    ...networkState,
    isOnline,
  };
};
