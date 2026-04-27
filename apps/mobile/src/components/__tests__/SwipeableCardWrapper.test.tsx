/**
 * SwipeableCardWrapper Component Tests
 *
 * Rewritten 2026-04-26 alongside the Reanimated 4 + gesture-handler
 * rewrite of the component itself (#1 step 3). The previous version
 * captured PanResponder.create configs and asserted against
 * Animated.timing/spring; both are gone. The new tests:
 *   1. Mock react-native-reanimated to synchronous shared values +
 *      immediate withTiming completion so worklet callbacks
 *      (runOnJS) fire on the same tick the action was dispatched.
 *   2. Mock react-native-gesture-handler so Gesture.Pan() captures
 *      its onUpdate/onEnd handlers in module scope, lettings tests
 *      drive gestures imperatively.
 *
 * Coverage focus:
 *   - Component rendering across props.
 *   - Imperative ref methods: swipeLeft, swipeRight, unswipe.
 *   - Gesture handlers (onUpdate, onEnd) via captured handlers.
 *   - Card index progression + onSwipedAll + infinite mode.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// ── Mock react-native-reanimated ───────────────────────────────────────────────
//
// The library ships a Jest mock at 'react-native-reanimated/mock' but
// it doesn't expose `withTiming`'s callback semantics the way we need
// for runOnJS bridging tests. Roll a tiny inline mock that:
//   - useSharedValue returns { value: T } that's mutable.
//   - withTiming/withSpring set the target immediately and call the
//     completion callback synchronously with finished=true.
//   - runOnJS returns a JS-callable wrapper around the function.
//   - useAnimatedStyle returns an empty object (we don't assert on
//     style output in tests).
//   - interpolate is a passthrough returning outputRange[0] (good
//     enough for "did the component render" checks).
//   - Animated.View is just a regular RN View.
jest.mock('react-native-reanimated', () => {
  const ReactRN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactRN.View,
    },
    useSharedValue: <T,>(initial: T) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withTiming: <T,>(
      toValue: T,
      _config?: unknown,
      callback?: (finished: boolean) => void
    ) => {
      // Fire the completion synchronously so tests don't need extra
      // ticks to observe the post-swipe state update.
      if (callback) callback(true);
      return toValue;
    },
    withSpring: <T,>(toValue: T) => toValue,
    runOnJS:
      <Args extends unknown[], R>(fn: (...args: Args) => R) =>
      (...args: Args) =>
        fn(...args),
    interpolate: (_value: number, _input: number[], output: number[]): number =>
      output[0],
    Extrapolation: { CLAMP: 'clamp' },
  };
});

// ── Mock react-native-gesture-handler ──────────────────────────────────────────
//
// Capture Gesture.Pan() handlers in a module-level variable so each
// test can drive gestures via mockGesturePanHandlers.onUpdate / onEnd.
// `GestureDetector` becomes a passthrough View.
let mockGesturePanHandlers: {
  onUpdate?: (event: {
    translationX: number;
    translationY: number;
    velocityX: number;
    velocityY: number;
  }) => void;
  onEnd?: (event: {
    translationX: number;
    translationY: number;
    velocityX: number;
    velocityY: number;
  }) => void;
} = {};

jest.mock('react-native-gesture-handler', () => {
  const ReactRN = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return {
    __esModule: true,
    Gesture: {
      Pan: () => {
        const handlers: Record<string, unknown> = {};
        const chain = {
          onUpdate(fn: unknown) {
            handlers.onUpdate = fn;
            mockGesturePanHandlers.onUpdate =
              fn as typeof mockGesturePanHandlers.onUpdate;
            return chain;
          },
          onEnd(fn: unknown) {
            handlers.onEnd = fn;
            mockGesturePanHandlers.onEnd =
              fn as typeof mockGesturePanHandlers.onEnd;
            return chain;
          },
        };
        return chain;
      },
    },
    GestureDetector: ({ children }: { children: unknown }) =>
      ReactLib.createElement(ReactRN.View, null, children),
  };
});

// Component imported AFTER mocks are set up.
const SwipeableCardWrapper = require('../SwipeableCardWrapper').default;
type SwipeableCardRef = import('../SwipeableCardWrapper').SwipeableCardRef;

beforeEach(() => {
  mockGesturePanHandlers = {};
});

describe('SwipeableCardWrapper', () => {
  const mockCards = [
    { id: 1, name: 'Card 1' },
    { id: 2, name: 'Card 2' },
    { id: 3, name: 'Card 3' },
    { id: 4, name: 'Card 4' },
    { id: 5, name: 'Card 5' },
  ];
  const mockRenderCard = jest.fn(
    (item: { id: number; name: string }) =>
      React.createElement(
        View,
        { testID: `card-${item.id}` },
        React.createElement(Text, null, item.name)
      ) as React.ReactNode
  );
  const mockOnSwipedLeft = jest.fn();
  const mockOnSwipedRight = jest.fn();
  const mockOnSwipedAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('renders without crashing', () => {
      render(
        <SwipeableCardWrapper cards={mockCards} renderCard={mockRenderCard} />
      );
      expect(mockRenderCard).toHaveBeenCalled();
    });

    it('renders the first card by default', () => {
      render(
        <SwipeableCardWrapper cards={mockCards} renderCard={mockRenderCard} />
      );
      expect(mockRenderCard).toHaveBeenCalledWith(mockCards[0], 0);
    });

    it('renders with custom cardIndex', () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          cardIndex={2}
        />
      );
      expect(mockRenderCard).toHaveBeenCalledWith(mockCards[2], 2);
    });

    it('renders empty container when currentIndex exceeds cards length', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          cardIndex={10}
        />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with custom backgroundColor + containerStyle + cardStyle', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          backgroundColor='red'
          containerStyle={{ padding: 20 }}
          cardStyle={{ borderRadius: 10 }}
        />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with empty cards array', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper cards={[]} renderCard={mockRenderCard} />
      );
      expect(UNSAFE_root).toBeTruthy();
    });

    it('renders with dragBackdrop=true', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          dragBackdrop
        />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Card stack rendering', () => {
    it('renders stackSize cards', () => {
      mockRenderCard.mockClear();
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackSize={3}
        />
      );
      expect(mockRenderCard).toHaveBeenCalledTimes(3);
    });

    it('does not render more cards than available', () => {
      mockRenderCard.mockClear();
      render(
        <SwipeableCardWrapper
          cards={[mockCards[0], mockCards[1]]}
          renderCard={mockRenderCard}
          stackSize={5}
        />
      );
      expect(mockRenderCard).toHaveBeenCalledTimes(2);
    });

    it('renders with stackRotationDeg + stackTranslateX (fanned deck)', () => {
      const { UNSAFE_root } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackSize={3}
          stackRotationDeg={2}
          stackTranslateX={6}
        />
      );
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Overlay labels', () => {
    it('renders overlay labels on the top card only', () => {
      const leftLabel = (
        <Text testID='pass-label'>PASS</Text>
      ) as React.ReactNode;
      const rightLabel = (
        <Text testID='accept-label'>ACCEPT</Text>
      ) as React.ReactNode;
      const { getByTestId } = render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          stackSize={3}
          overlayLabels={{
            left: { element: leftLabel },
            right: { element: rightLabel },
          }}
        />
      );
      expect(getByTestId('pass-label')).toBeTruthy();
      expect(getByTestId('accept-label')).toBeTruthy();
    });
  });

  describe('Gesture: onUpdate captures translations', () => {
    it('captures Gesture.Pan handlers on mount', () => {
      render(
        <SwipeableCardWrapper cards={mockCards} renderCard={mockRenderCard} />
      );
      expect(mockGesturePanHandlers.onUpdate).toBeDefined();
      expect(mockGesturePanHandlers.onEnd).toBeDefined();
    });
  });

  describe('Gesture: onEnd swipe direction detection', () => {
    it('fires onSwipedRight when translationX exceeds threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
        />
      );
      act(() => {
        mockGesturePanHandlers.onEnd?.({
          translationX: 200,
          translationY: 0,
          velocityX: 0,
          velocityY: 0,
        });
      });
      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
      });
    });

    it('fires onSwipedLeft when translationX past negative threshold', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );
      act(() => {
        mockGesturePanHandlers.onEnd?.({
          translationX: -200,
          translationY: 0,
          velocityX: 0,
          velocityY: 0,
        });
      });
      await waitFor(() => {
        expect(mockOnSwipedLeft).toHaveBeenCalledWith(0);
      });
    });

    it('fires swipe via velocity even when distance is small', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
        />
      );
      act(() => {
        mockGesturePanHandlers.onEnd?.({
          translationX: 30, // small distance
          translationY: 0,
          velocityX: 1500, // fast flick
          velocityY: 0,
        });
      });
      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
      });
    });

    it('does NOT fire callback when below distance + velocity thresholds', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
          onSwipedRight={mockOnSwipedRight}
        />
      );
      act(() => {
        mockGesturePanHandlers.onEnd?.({
          translationX: 20,
          translationY: 0,
          velocityX: 100,
          velocityY: 0,
        });
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(mockOnSwipedLeft).not.toHaveBeenCalled();
      expect(mockOnSwipedRight).not.toHaveBeenCalled();
    });

    it('ignores horizontal gesture when horizontalSwipe=false', async () => {
      render(
        <SwipeableCardWrapper
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          horizontalSwipe={false}
        />
      );
      act(() => {
        mockGesturePanHandlers.onEnd?.({
          translationX: 500,
          translationY: 0,
          velocityX: 2000,
          velocityY: 0,
        });
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(mockOnSwipedRight).not.toHaveBeenCalled();
    });
  });

  describe('Imperative ref methods', () => {
    it('exposes swipeLeft + swipeRight + unswipe', () => {
      const ref = React.createRef<SwipeableCardRef>();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );
      expect(ref.current).toBeTruthy();
      expect(typeof ref.current?.swipeLeft).toBe('function');
      expect(typeof ref.current?.swipeRight).toBe('function');
      expect(typeof ref.current?.unswipe).toBe('function');
    });

    it('swipeLeft fires onSwipedLeft + advances index', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );
      act(() => {
        ref.current?.swipeLeft();
      });
      await waitFor(() => {
        expect(mockOnSwipedLeft).toHaveBeenCalledWith(0);
        expect(mockRenderCard).toHaveBeenCalledWith(mockCards[1], 1);
      });
    });

    it('swipeRight fires onSwipedRight + advances index', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
        />
      );
      act(() => {
        ref.current?.swipeRight();
      });
      await waitFor(() => {
        expect(mockOnSwipedRight).toHaveBeenCalledWith(0);
      });
    });

    it('unswipe steps back one card', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      mockRenderCard.mockClear();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedLeft={mockOnSwipedLeft}
        />
      );
      act(() => {
        ref.current?.swipeLeft();
      });
      await waitFor(() => expect(mockOnSwipedLeft).toHaveBeenCalledWith(0));
      mockRenderCard.mockClear();
      act(() => {
        ref.current?.unswipe();
      });
      await waitFor(() => {
        // After unswipe, card index 0 renders again (now back at top).
        expect(mockRenderCard).toHaveBeenCalledWith(mockCards[0], 0);
      });
    });

    it('unswipe at index 0 is a safe no-op', () => {
      const ref = React.createRef<SwipeableCardRef>();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );
      expect(() => ref.current?.unswipe()).not.toThrow();
    });
  });

  describe('Card progression + onSwipedAll', () => {
    it('progresses through all cards via swipeLeft', async () => {
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
      for (let i = 0; i < mockCards.length; i++) {
        act(() => {
          ref.current?.swipeLeft();
        });
        // eslint-disable-next-line no-await-in-loop
        await waitFor(() => {
          expect(mockOnSwipedLeft).toHaveBeenCalledWith(i);
        });
      }
      expect(mockOnSwipedAll).toHaveBeenCalledTimes(1);
    });

    it('does not call onSwipedAll mid-deck', async () => {
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
      act(() => {
        ref.current?.swipeRight();
      });
      await waitFor(() => expect(mockOnSwipedRight).toHaveBeenCalled());
      expect(mockOnSwipedAll).not.toHaveBeenCalled();
    });

    it('infinite=true loops to first card after last', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      mockRenderCard.mockClear();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
          onSwipedRight={mockOnSwipedRight}
          onSwipedAll={mockOnSwipedAll}
          infinite
        />
      );
      for (let i = 0; i < mockCards.length; i++) {
        act(() => {
          ref.current?.swipeRight();
        });
        // eslint-disable-next-line no-await-in-loop
        await waitFor(() => {
          expect(mockOnSwipedRight).toHaveBeenCalledWith(i);
        });
      }
      // After the last card, infinite mode resets to 0 instead of
      // calling onSwipedAll.
      expect(mockOnSwipedAll).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockRenderCard).toHaveBeenCalledWith(mockCards[0], 0);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles single card gracefully', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={[mockCards[0]]}
          renderCard={mockRenderCard}
          onSwipedAll={mockOnSwipedAll}
        />
      );
      act(() => {
        ref.current?.swipeLeft();
      });
      await waitFor(() => expect(mockOnSwipedAll).toHaveBeenCalledTimes(1));
    });

    it('handles undefined callbacks without throwing', async () => {
      const ref = React.createRef<SwipeableCardRef>();
      render(
        <SwipeableCardWrapper
          ref={ref}
          cards={mockCards}
          renderCard={mockRenderCard}
        />
      );
      expect(() => ref.current?.swipeLeft()).not.toThrow();
      expect(() => ref.current?.swipeRight()).not.toThrow();
    });
  });

  describe('Display name', () => {
    it('has correct displayName', () => {
      expect(SwipeableCardWrapper.displayName).toBe('SwipeableCardWrapper');
    });
  });
});
