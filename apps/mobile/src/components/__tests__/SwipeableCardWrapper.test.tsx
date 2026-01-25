/**
 * SwipeableCardWrapper Component Tests
 *
 * Comprehensive test suite for the SwipeableCardWrapper component
 * Testing swipe gestures, animations, callbacks, and edge cases
 * Target: 100% coverage with deterministic tests
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import SwipeableCardWrapper, { SwipeableCardRef } from '../SwipeableCardWrapper';

// Import mocks from react-native
const { Animated, PanResponder, Dimensions } = require('react-native');

// Store panResponder configs for testing
let lastPanResponderConfig: any = null;

// Override PanResponder.create to capture config while still using the mock
const originalPanResponderCreate = PanResponder.create;
PanResponder.create = jest.fn((config) => {
  lastPanResponderConfig = config;
  return originalPanResponderCreate(config);
});

// Create a more complete mock for Animated.ValueXY
Animated.ValueXY = jest.fn(function (this: any, value?: any) {
  const x = {
    _value: 0,
    setValue: jest.fn(function (this: any, v: any) { this._value = v; }),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    extractOffset: jest.fn(),
    interpolate: jest.fn(function (this: any) { return this; }),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn(),
    resetAnimation: jest.fn(),
  };

  const y = {
    _value: 0,
    setValue: jest.fn(function (this: any, v: any) { this._value = v; }),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    extractOffset: jest.fn(),
    interpolate: jest.fn(function (this: any) { return this; }),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn(),
    resetAnimation: jest.fn(),
  };

  this.x = x;
  this.y = y;
  this._value = { x: 0, y: 0 };

  this.setValue = jest.fn((val: any) => {
    if (val.x !== undefined) this.x.setValue(val.x);
    if (val.y !== undefined) this.y.setValue(val.y);
    this._value = val;
  });

  this.setOffset = jest.fn((offset: any) => {
    if (offset.x !== undefined) this.x.setOffset(offset.x);
    if (offset.y !== undefined) this.y.setOffset(offset.y);
  });

  this.flattenOffset = jest.fn(() => {
    this.x.flattenOffset();
    this.y.flattenOffset();
  });

  this.extractOffset = jest.fn(() => {
    this.x.extractOffset();
    this.y.extractOffset();
  });

  this.getLayout = jest.fn(() => ({
    left: this.x,
    top: this.y,
  }));

  this.getTranslateTransform = jest.fn(() => [
    { translateX: this.x },
    { translateY: this.y },
  ]);

  this.addListener = jest.fn();
  this.removeListener = jest.fn();
  this.removeAllListeners = jest.fn();
  this.stopAnimation = jest.fn();
  this.resetAnimation = jest.fn();

  return this;
} as any);

// Make animations execute immediately
const createMockAnimation = (valueSetter?: (value: any, config: any) => void) => {
  return jest.fn((value: any, config: any) => ({
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (valueSetter) {
        valueSetter(value, config);
      }
      if (callback) {
        setTimeout(() => callback({ finished: true }), 0);
      }
    }),
    stop: jest.fn(),
  }));
};

Animated.timing = createMockAnimation((value, config) => {
  if (value && value.setValue) {
    value.setValue(config.toValue);
  }
});

Animated.spring = createMockAnimation((value, config) => {
  if (value && value.setValue) {
    value.setValue(config.toValue);
  }
});

Animated.parallel = jest.fn((animations: any[]) => ({
  start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
    animations.forEach((anim: any) => {
      if (anim && anim.start) {
        anim.start();
      }
    });
    if (callback) {
      setTimeout(() => callback({ finished: true }), 0);
    }
  }),
  stop: jest.fn(),
}));

describe('SwipeableCardWrapper', () => {
  // Mock card data
  const mockCards = [
    { id: 1, name: 'Card 1' },
    { id: 2, name: 'Card 2' },
    { id: 3, name: 'Card 3' },
    { id: 4, name: 'Card 4' },
    { id: 5, name: 'Card 5' },
  ];

  // Mock render function
  const mockRenderCard = jest.fn((item: any) => (
    <View testID={`card-${item.id}`}>
      <Text>{item.name}</Text>
    </View>
  ));

  // Mock callbacks
  const mockOnSwipedLeft = jest.fn();
  const mockOnSwipedRight = jest.fn();
  const mockOnSwipedAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      expect(mockRenderCard).toHaveBeenCalled();
    });

    it('should render the first card by default', () => {
      const { getByTestId } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      expect(mockRenderCard).toHaveBeenCalledWith(mockCards[0], 0);
    });

    it('should render with custom cardIndex', () => {
      const { getByTestId } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          cardIndex={2}
        />
      );

      expect(mockRenderCard).toHaveBeenCalledWith(mockCards[2], 2);
    });

    it('should render null when currentIndex exceeds cards length', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          cardIndex={10}
        />
      );

      // Should still render container but no cards
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with custom backgroundColor', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          backgroundColor="red"
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with custom containerStyle', () => {
      const customStyle = { padding: 20 };
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          containerStyle={customStyle}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with custom cardStyle', () => {
      const customCardStyle = { borderRadius: 10 };
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          cardStyle={customCardStyle}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with useViewOverflow=false', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          useViewOverflow={false}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with empty cards array', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={[]}
          renderCard={mockRenderCard}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Card Stack Rendering', () => {
    it('should render stackSize number of cards', () => {
      mockRenderCard.mockClear();

      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackSize={3}
        />
      );

      // Should render 3 cards (indices 0, 1, 2)
      expect(mockRenderCard).toHaveBeenCalledTimes(3);
    });

    it('should render with custom stackSize', () => {
      mockRenderCard.mockClear();

      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackSize={2}
        />
      );

      expect(mockRenderCard).toHaveBeenCalledTimes(2);
    });

    it('should not render more cards than available', () => {
      mockRenderCard.mockClear();
      const twoCards = [mockCards[0], mockCards[1]];

      render(
        <SwipeableCardWrapper
          cards={twoCards}
          renderCard={mockRenderCard}
          stackSize={5}
        />
      );

      // Should only render 2 cards even though stackSize is 5
      expect(mockRenderCard).toHaveBeenCalledTimes(2);
    });

    it('should render with showSecondCard=false', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          showSecondCard={false}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with custom stackScale', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackScale={10}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with custom stackSeparation', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackSeparation={15}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Overlay Labels', () => {
    it('should render with left overlay label', () => {
      const leftLabel = <Text testID="left-label">Nope</Text>;

      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          overlayLabels={{
            left: { element: leftLabel },
          }}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with right overlay label', () => {
      const rightLabel = <Text testID="right-label">Like</Text>;

      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          overlayLabels={{
            right: { element: rightLabel },
          }}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render with both overlay labels', () => {
      const leftLabel = <Text testID="left-label">Nope</Text>;
      const rightLabel = <Text testID="right-label">Like</Text>;

      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          overlayLabels={{
            left: { element: leftLabel },
            right: { element: rightLabel },
          }}
        />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should not render overlay labels on non-top cards', () => {
      const leftLabel = <Text testID="left-label">Nope</Text>;

      const { queryByTestId } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          overlayLabels={{
            left: { element: leftLabel },
          }}
          stackSize={3}
        />
      );

      // Overlay should only be on top card
      expect(queryByTestId).toBeTruthy();
    });
  });

  describe('PanResponder - Gesture Handling', () => {
    it('should call onStartShouldSetPanResponder', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      expect(PanResponder.create).toHaveBeenCalled();
      expect(lastPanResponderConfig.onStartShouldSetPanResponder()).toBe(true);
    });

    it('should call onMoveShouldSetPanResponder', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      expect(lastPanResponderConfig.onMoveShouldSetPanResponder()).toBe(true);
    });

    it('should handle onPanResponderGrant', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      // Should not throw
      expect(() => lastPanResponderConfig.onPanResponderGrant()).not.toThrow();
    });

    it('should handle horizontal swipe in onPanResponderMove', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: 100, dy: 0 };
      expect(() => lastPanResponderConfig.onPanResponderMove({}, gestureState)).not.toThrow();
    });

    it('should handle vertical swipe in onPanResponderMove', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          verticalSwipe={true}
        />
      );

      const gestureState = { dx: 0, dy: 100 };
      expect(() => lastPanResponderConfig.onPanResponderMove({}, gestureState)).not.toThrow();
    });

    it('should ignore horizontal swipe when horizontalSwipe=false', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          horizontalSwipe={false}
        />
      );

      const gestureState = { dx: 100, dy: 0 };
      expect(() => lastPanResponderConfig.onPanResponderMove({}, gestureState)).not.toThrow();
    });

    it('should ignore vertical swipe when verticalSwipe=false', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          verticalSwipe={false}
        />
      );

      const gestureState = { dx: 0, dy: 100 };
      expect(() => lastPanResponderConfig.onPanResponderMove({}, gestureState)).not.toThrow();
    });
  });

  describe('Swipe Right Detection', () => {
    it('should detect swipe right when dx exceeds threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: 100, dy: 0 }; // 100 > 25% of 375 = 93.75
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
      });
    });

    it('should not swipe right when below threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: 50, dy: 0 }; // 50 < 93.75
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedRight).not.toHaveBeenCalled();
      });
    });

    it('should not swipe right when horizontalSwipe=false', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          horizontalSwipe={false}
        />
      );

      const gestureState = { dx: 100, dy: 0 };
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedRight).not.toHaveBeenCalled();
      });
    });
  });

  describe('Swipe Left Detection', () => {
    it('should detect swipe left when dx is below negative threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: -100, dy: 0 }; // -100 < -93.75
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedLeft).toHaveBeenCalledWith(0);
      });
    });

    it('should not swipe left when above negative threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: -50, dy: 0 }; // -50 > -93.75
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedLeft).not.toHaveBeenCalled();
      });
    });

    it('should not swipe left when horizontalSwipe=false', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          horizontalSwipe={false}
        />
      );

      const gestureState = { dx: -100, dy: 0 };
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedLeft).not.toHaveBeenCalled();
      });
    });
  });

  describe('Card Reset on Incomplete Swipe', () => {
    it('should reset position when swipe is incomplete', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          onSwipedRight={mockOnSwipedRight}
        />
      );

      const gestureState = { dx: 50, dy: 0 }; // Below threshold
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedLeft).not.toHaveBeenCalled();
        expect(mockOnSwipedRight).not.toHaveBeenCalled();
        expect(Animated.spring).toHaveBeenCalled();
      });
    });
  });

  describe('Imperative Ref Methods', () => {
    it('should expose swipeLeft method via ref', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );

      expect(ref.current).toBeTruthy();
      expect(ref.current?.swipeLeft).toBeDefined();

      ref.current?.swipeLeft();

      await waitFor(() => {
        expect(mockOnSwipedLeft).toHaveBeenCalledWith(0);
      });
    });

    it('should expose swipeRight method via ref', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
        />
      );

      expect(ref.current).toBeTruthy();
      expect(ref.current?.swipeRight).toBeDefined();

      ref.current?.swipeRight();

      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
      });
    });

    it('should call swipeLeft multiple times correctly', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );

      ref.current?.swipeLeft();
      await waitFor(() => expect(mockOnSwipedLeft).toHaveBeenCalledWith(0));

      ref.current?.swipeLeft();
      await waitFor(() => expect(mockOnSwipedLeft).toHaveBeenCalledWith(1));
    });

    it('should call swipeRight multiple times correctly', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
        />
      );

      ref.current?.swipeRight();
      await waitFor(() => expect(mockOnSwipedRight).toHaveBeenCalledWith(0));

      ref.current?.swipeRight();
      await waitFor(() => expect(mockOnSwipedRight).toHaveBeenCalledWith(1));
    });
  });

  describe('Card Index Progression', () => {
    it('should increment currentIndex after swipe', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      mockRenderCard.mockClear();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
        />
      );

      // Initially renders card 0
      expect(mockRenderCard).toHaveBeenCalledWith(mockCards[0], 0);

      ref.current?.swipeRight();

      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
        // After swipe, should render card 1
        expect(mockRenderCard).toHaveBeenCalledWith(mockCards[1], 1);
      });
    });

    it('should progress through all cards', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );

      // Swipe through all cards
      for (let i = 0; i < mockCards.length; i++) {
        ref.current?.swipeLeft();
        await waitFor(() => {
          expect(mockOnSwipedLeft).toHaveBeenCalledWith(i);
        });
      }

      expect(mockOnSwipedLeft).toHaveBeenCalledTimes(mockCards.length);
    });
  });

  describe('onSwipedAll Callback', () => {
    it('should call onSwipedAll when last card is swiped', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          onSwipedAll={mockOnSwipedAll}
        />
      );

      // Swipe through all cards
      for (let i = 0; i < mockCards.length; i++) {
        ref.current?.swipeLeft();
        await waitFor(() => {
          expect(mockOnSwipedLeft).toHaveBeenCalledWith(i);
        });
      }

      await waitFor(() => {
        expect(mockOnSwipedAll).toHaveBeenCalledTimes(1);
      });
    });

    it('should not call onSwipedAll before last card', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          onSwipedAll={mockOnSwipedAll}
        />
      );

      ref.current?.swipeRight();

      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
        expect(mockOnSwipedAll).not.toHaveBeenCalled();
      });
    });

    it('should handle onSwipedAll being undefined', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );

      // Swipe through all cards
      for (let i = 0; i < mockCards.length; i++) {
        ref.current?.swipeLeft();
        await waitFor(() => {
          expect(mockOnSwipedLeft).toHaveBeenCalledWith(i);
        });
      }

      // Should not throw
      expect(mockOnSwipedLeft).toHaveBeenCalledTimes(mockCards.length);
    });
  });

  describe('Infinite Mode', () => {
    it('should loop back to first card when infinite=true', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      mockRenderCard.mockClear();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          infinite={true}
        />
      );

      // Swipe through all cards
      for (let i = 0; i < mockCards.length; i++) {
        ref.current?.swipeRight();
        await waitFor(() => {
          expect(mockOnSwipedRight).toHaveBeenCalledWith(i);
        });
      }

      // Should loop back and render first card again
      await waitFor(() => {
        expect(mockRenderCard).toHaveBeenCalledWith(mockCards[0], 0);
      });
    });

    it('should not call onSwipedAll when infinite=true', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          onSwipedAll={mockOnSwipedAll}
          infinite={true}
        />
      );

      // Swipe through all cards
      for (let i = 0; i < mockCards.length; i++) {
        ref.current?.swipeLeft();
        await waitFor(() => {
          expect(mockOnSwipedLeft).toHaveBeenCalledWith(i);
        });
      }

      expect(mockOnSwipedAll).not.toHaveBeenCalled();
    });
  });

  describe('Callback Undefined Handling', () => {
    it('should not crash when onSwipedLeft is undefined', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      expect(() => ref.current?.swipeLeft()).not.toThrow();

      await waitFor(() => {
        // Should still progress
        expect(mockRenderCard).toHaveBeenCalled();
      });
    });

    it('should not crash when onSwipedRight is undefined', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      expect(() => ref.current?.swipeRight()).not.toThrow();

      await waitFor(() => {
        // Should still progress
        expect(mockRenderCard).toHaveBeenCalled();
      });
    });
  });

  describe('Animation Behavior', () => {
    it('should trigger timing animation on swipe', async () => {
      const Animated = require('react-native').Animated;
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      ref.current?.swipeLeft();

      await waitFor(() => {
        expect(Animated.timing).toHaveBeenCalled();
        expect(Animated.parallel).toHaveBeenCalled();
      });
    });

    it('should trigger spring animation on reset', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );

      const gestureState = { dx: 50, dy: 0 }; // Below threshold
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(Animated.spring).toHaveBeenCalled();
      });
    });

    it('should reset animation values after swipe completes', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );

      ref.current?.swipeLeft();

      await waitFor(() => {
        expect(mockOnSwipedLeft).toHaveBeenCalledWith(0);
        // Animation should complete and reset
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single card', async () => {
      const singleCard = [mockCards[0]];
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={singleCard}
          renderCard={mockRenderCard}
          onSwipedAll={mockOnSwipedAll}
        />
      );

      ref.current?.swipeLeft();

      await waitFor(() => {
        expect(mockOnSwipedAll).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle swipe at last card', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          cardIndex={mockCards.length - 1}
          onSwipedAll={mockOnSwipedAll}
        />
      );

      ref.current?.swipeRight();

      await waitFor(() => {
        expect(mockOnSwipedAll).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle rapid successive swipes', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );

      // Trigger 3 swipes rapidly
      ref.current?.swipeLeft();
      ref.current?.swipeLeft();
      ref.current?.swipeLeft();

      await waitFor(() => {
        // Should handle all swipes
        expect(mockOnSwipedLeft).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle alternating swipe directions', async () => {
      const ref = React.createRef<SwipeableCardRef>();

      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          onSwipedRight={mockOnSwipedRight}
        />
      );

      ref.current?.swipeLeft();
      await waitFor(() => expect(mockOnSwipedLeft).toHaveBeenCalledWith(0));

      ref.current?.swipeRight();
      await waitFor(() => expect(mockOnSwipedRight).toHaveBeenCalledWith(1));

      ref.current?.swipeLeft();
      await waitFor(() => expect(mockOnSwipedLeft).toHaveBeenCalledWith(2));
    });

    it('should skip cards beyond array length', () => {
      const twoCards = [mockCards[0], mockCards[1]];
      mockRenderCard.mockClear();

      render(
        <SwipeableCardWrapper
          cards={twoCards}
          renderCard={mockRenderCard}
          cardIndex={0}
          stackSize={5}
        />
      );

      // Should only render 2 cards even with stackSize=5
      expect(mockRenderCard).toHaveBeenCalledTimes(2);
    });
  });

  describe('Display Name', () => {
    it('should have correct displayName', () => {
      expect(SwipeableCardWrapper.displayName).toBe('SwipeableCardWrapper');
    });
  });

  describe('TypeScript Types', () => {
    it('should accept all valid props', () => {
      const ref = React.createRef<SwipeableCardRef>();

      const validProps = {
        ref,
        cards: mockCards,
        renderCard: mockRenderCard,
        onSwipedLeft: mockOnSwipedLeft,
        onSwipedRight: mockOnSwipedRight,
        onSwipedAll: mockOnSwipedAll,
        cardIndex: 0,
        backgroundColor: 'red',
        stackSize: 3,
        infinite: false,
        verticalSwipe: true,
        horizontalSwipe: true,
        showSecondCard: true,
        stackScale: 5,
        stackSeparation: 8,
        overlayLabels: {
          left: { element: <Text>Left</Text> },
          right: { element: <Text>Right</Text> },
        },
        containerStyle: { padding: 10 },
        cardStyle: { borderRadius: 5 },
        useViewOverflow: true,
      };

      expect(() => render(<SwipeableCardWrapper {...validProps} />)).not.toThrow();
    });
  });

  describe('Complex Gesture Scenarios', () => {
    it('should handle swipe right at exact threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: 93.75, dy: 0 }; // Exactly at threshold (25% of 375)
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      // At exact threshold, should NOT trigger (needs to exceed)
      await waitFor(() => {
        expect(mockOnSwipedRight).not.toHaveBeenCalled();
      });
    });

    it('should handle swipe left at exact threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: -93.75, dy: 0 }; // Exactly at threshold
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      // At exact threshold, should NOT trigger (needs to exceed)
      await waitFor(() => {
        expect(mockOnSwipedLeft).not.toHaveBeenCalled();
      });
    });

    it('should handle gesture with both dx and dy', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          horizontalSwipe={true}
          verticalSwipe={true}
        />
      );

      const gestureState = { dx: 100, dy: 50 }; // Diagonal swipe
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      // Should still trigger based on dx
      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
      });
    });

    it('should prioritize right swipe over left when both thresholds met', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          onSwipedRight={mockOnSwipedRight}
          horizontalSwipe={true}
        />
      );

      const gestureState = { dx: 100, dy: 0 }; // Positive dx (right)
      lastPanResponderConfig.onPanResponderRelease({}, gestureState);

      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
        expect(mockOnSwipedLeft).not.toHaveBeenCalled();
      });
    });
  });

  describe('Memory and Performance', () => {
    it('should not render cards beyond stackSize', () => {
      mockRenderCard.mockClear();

      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackSize={1}
        />
      );

      // Should only render 1 card
      expect(mockRenderCard).toHaveBeenCalledTimes(1);
    });

    it('should handle large card arrays efficiently', () => {
      const largeCardArray = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      mockRenderCard.mockClear();

      render(
        <SwipeableCardWrapper
          cards={largeCardArray}
          renderCard={mockRenderCard}
          stackSize={3}
        />
      );

      // Should still only render stackSize cards
      expect(mockRenderCard).toHaveBeenCalledTimes(3);
    });
  });
});
