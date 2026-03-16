// Type declarations for modules without official types

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
    details: unknown;
  }

  const NetInfo: {
    fetch: () => Promise<NetInfoState>;
    addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  };

  export default NetInfo;
}

// Removed react-native-deck-swiper declaration - using SwipeableCardWrapper instead
// The vulnerable package has been replaced with a secure custom implementation

declare module 'react-native-elements' {
  export * from 'react-native-elements/src';
}

declare module 'react-native-vector-icons/MaterialIcons' {
  import { ComponentType } from 'react';
  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: unknown;
  }
  const MaterialIcons: ComponentType<IconProps>;
  export default MaterialIcons;
}

declare module 'react-native-swiper' {
  import { ComponentType } from 'react';
  const Swiper: ComponentType<Record<string, unknown>>;
  export default Swiper;
}
