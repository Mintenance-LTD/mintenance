// Type declarations for modules without official types

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
    details: any;
  }
  
  const NetInfo: {
    fetch: () => Promise<NetInfoState>;
    addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  };
  
  export default NetInfo;
}

declare module 'react-native-deck-swiper' {
  import { Component } from 'react';
  
  export interface SwipeDirection {
    x: number;
    y: number;
  }
  
  export interface DeckSwiperProps {
    cards: any[];
    onSwipedLeft?: (index: number) => void;
    onSwipedRight?: (index: number) => void;
    onSwipedTop?: (index: number) => void;
    onSwipedBottom?: (index: number) => void;
    onSwiped?: (index: number) => void;
    renderCard: (card: any, index: number) => JSX.Element;
    cardIndex?: number;
    backgroundColor?: string;
    infinite?: boolean;
    showSecondCard?: boolean;
    stackSize?: number;
    overlayLabels?: any;
    animateOverlayLabelsOpacity?: boolean;
    animateCardOpacity?: boolean;
  }
  
  export default class DeckSwiper extends Component<DeckSwiperProps> {}
}

declare module 'react-native-elements' {
  export * from 'react-native-elements/src';
}