/**
 * Swipeable Card Wrapper — Reanimated 4 + gesture-handler
 *
 * Step 3 of the Review Bids redesign moves the swipe gesture from
 * PanResponder + Animated to Gesture.Pan + Reanimated 4 shared values
 * so the drag, fling-out, snap-to-stack, and overlay opacity all run
 * on the UI thread instead of bouncing through JS for each frame.
 *
 * Public API preserved exactly so BidReviewScreen and ContractorCard
 * keep working without changes:
 *   - All props (cards, renderCard, callbacks, stackSize/Scale/
 *     Separation/RotationDeg/TranslateX, dragBackdrop, overlayLabels,
 *     containerStyle/cardStyle, useViewOverflow, infinite,
 *     verticalSwipe/horizontalSwipe, showSecondCard).
 *   - All ref methods: swipeLeft, swipeRight, unswipe.
 *
 * Key implementation choices:
 *   - Top card lives in a `TopCard` sub-component so it can call
 *     `useAnimatedStyle` once for the drag transform.
 *   - Stacked cards live in `StackedCard` sub-components so each
 *     can call `useAnimatedStyle` once for its depth-i → depth-(i-1)
 *     interpolation tied to `transitionProgress`.
 *   - `swipeCard` uses `withTiming(...).start()` semantics via
 *     Reanimated 4's withTiming completion callback, then bridges
 *     to JS via `runOnJS(onSwipeOutComplete)` so React state +
 *     parent callbacks fire on the JS thread.
 */
import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useEffect,
} from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');

// Maximum tilt of the top card while dragging (Tinder/IndiGo style).
const MAX_DRAG_TILT_DEG = 12;
// Velocity threshold for "fling-to-swipe" — even a short drag with a
// fast flick commits the swipe, matching the feel users expect.
const SWIPE_VELOCITY_THRESHOLD = 800;
const SWIPE_OUT_DURATION = 280;

interface SwipeableCardWrapperProps<T = unknown> {
  cards: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  onSwipedLeft?: (cardIndex: number) => void;
  onSwipedRight?: (cardIndex: number) => void;
  onSwipedAll?: () => void;
  cardIndex?: number;
  backgroundColor?: string;
  stackSize?: number;
  infinite?: boolean;
  verticalSwipe?: boolean;
  horizontalSwipe?: boolean;
  showSecondCard?: boolean;
  stackScale?: number;
  stackSeparation?: number;
  /**
   * Subtle alternating rotation for stacked cards (IndiGo-style fanned
   * deck). Degrees per stack-depth, alternating sign so the deck fans
   * outward. 0 = no rotation (default keeps backward compat).
   */
  stackRotationDeg?: number;
  /**
   * Horizontal offset per stack-depth (alternating sign with rotation).
   */
  stackTranslateX?: number;
  /**
   * When true, render a subtle dimming overlay behind the active card
   * whose opacity tracks |translateX|. Default false.
   */
  dragBackdrop?: boolean;
  overlayLabels?: {
    left?: { element: React.ReactNode };
    right?: { element: React.ReactNode };
  };
  containerStyle?: ViewStyle;
  cardStyle?: ViewStyle;
  useViewOverflow?: boolean;
}

export interface SwipeableCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  unswipe: () => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface TopCardProps {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  fadeOpacity: SharedValue<number>;
  scaleVal: SharedValue<number>;
  cardStyle?: ViewStyle;
  overlayLabels?: SwipeableCardWrapperProps['overlayLabels'];
  panGesture: ReturnType<typeof Gesture.Pan>;
  children: React.ReactNode;
}

const TopCard: React.FC<TopCardProps> = ({
  translateX,
  translateY,
  fadeOpacity,
  scaleVal,
  cardStyle,
  overlayLabels,
  panGesture,
  children,
}) => {
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const tilt = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-MAX_DRAG_TILT_DEG, 0, MAX_DRAG_TILT_DEG],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${tilt}deg` },
        { scale: scaleVal.value },
      ],
      opacity: fadeOpacity.value,
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-screenWidth / 4, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));
  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, screenWidth / 4],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle, cardAnimatedStyle]}>
        {children}
        {overlayLabels && (
          <>
            <Animated.View
              style={[
                styles.overlayLabel,
                styles.overlayLabelLeft,
                leftOverlayStyle,
              ]}
            >
              {overlayLabels.left?.element}
            </Animated.View>
            <Animated.View
              style={[
                styles.overlayLabel,
                styles.overlayLabelRight,
                rightOverlayStyle,
              ]}
            >
              {overlayLabels.right?.element}
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

interface StackedCardProps {
  depth: number;
  stackScale: number;
  stackSeparation: number;
  stackRotationDeg: number;
  stackTranslateX: number;
  showSecondCard: boolean;
  transitionProgress: SharedValue<number>;
  cardStyle?: ViewStyle;
  children: React.ReactNode;
}

const StackedCard: React.FC<StackedCardProps> = ({
  depth,
  stackScale,
  stackSeparation,
  stackRotationDeg,
  stackTranslateX,
  showSecondCard,
  transitionProgress,
  cardStyle,
  children,
}) => {
  const targetDepth = Math.max(0, depth - 1);
  const scaleNow = 1 - (depth * stackScale) / 100;
  const scaleNext = 1 - (targetDepth * stackScale) / 100;
  const translateYNow = depth * stackSeparation;
  const translateYNext = targetDepth * stackSeparation;
  const fanSignNow = depth % 2 === 0 ? 1 : -1;
  const rotationNow = stackRotationDeg * depth * fanSignNow;
  const translateXNow = stackTranslateX * depth * fanSignNow;
  const fanSignNext = targetDepth % 2 === 0 ? 1 : -1;
  const rotationNext = stackRotationDeg * targetDepth * fanSignNext;
  const translateXNext = stackTranslateX * targetDepth * fanSignNext;

  const animatedStyle = useAnimatedStyle(() => {
    const p = transitionProgress.value;
    return {
      transform: [
        { scale: interpolate(p, [0, 1], [scaleNow, scaleNext]) },
        { translateY: interpolate(p, [0, 1], [translateYNow, translateYNext]) },
        { translateX: interpolate(p, [0, 1], [translateXNow, translateXNext]) },
        {
          rotate: `${interpolate(p, [0, 1], [rotationNow, rotationNext])}deg`,
        },
      ],
      opacity: showSecondCard ? 1 : 0,
    };
  });

  return (
    <Animated.View
      style={[styles.card, styles.stackedCard, cardStyle, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};

// ── Main wrapper ───────────────────────────────────────────────────────────────

const SwipeableCardWrapper = forwardRef<
  SwipeableCardRef,
  SwipeableCardWrapperProps<unknown>
>(
  (
    {
      cards,
      renderCard,
      onSwipedLeft,
      onSwipedRight,
      onSwipedAll,
      cardIndex = 0,
      backgroundColor = 'transparent',
      stackSize = 3,
      infinite = false,
      verticalSwipe = true,
      horizontalSwipe = true,
      showSecondCard = true,
      stackScale = 5,
      stackSeparation = 8,
      stackRotationDeg = 0,
      stackTranslateX = 0,
      dragBackdrop = false,
      overlayLabels,
      containerStyle,
      cardStyle,
      useViewOverflow = true,
    },
    ref
  ) => {
    const [currentIndex, setCurrentIndex] = React.useState(cardIndex);
    const indexRef = useRef(currentIndex);
    useEffect(() => {
      indexRef.current = currentIndex;
    }, [currentIndex]);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const fadeOpacity = useSharedValue(1);
    const scaleVal = useSharedValue(1);
    const transitionProgress = useSharedValue(0);

    const resetSharedValues = useCallback(() => {
      translateX.value = 0;
      translateY.value = 0;
      fadeOpacity.value = 1;
      scaleVal.value = 1;
      transitionProgress.value = 0;
    }, [translateX, translateY, fadeOpacity, scaleVal, transitionProgress]);

    const onSwipeOutComplete = useCallback(
      (direction: 'left' | 'right', swipedIndex: number) => {
        if (direction === 'left') {
          onSwipedLeft?.(swipedIndex);
        } else {
          onSwipedRight?.(swipedIndex);
        }
        const nextIndex = swipedIndex + 1;
        if (nextIndex >= cards.length) {
          if (infinite) {
            setCurrentIndex(0);
          } else {
            onSwipedAll?.();
          }
        } else {
          setCurrentIndex(nextIndex);
        }
        resetSharedValues();
      },
      [
        cards.length,
        infinite,
        onSwipedAll,
        onSwipedLeft,
        onSwipedRight,
        resetSharedValues,
      ]
    );

    const swipeCard = useCallback(
      (direction: 'left' | 'right') => {
        const targetX =
          direction === 'left' ? -screenWidth * 1.5 : screenWidth * 1.5;
        const swipedIndex = indexRef.current;
        translateX.value = withTiming(targetX, {
          duration: SWIPE_OUT_DURATION,
        });
        transitionProgress.value = withTiming(1, {
          duration: SWIPE_OUT_DURATION,
        });
        fadeOpacity.value = withTiming(
          0,
          { duration: SWIPE_OUT_DURATION },
          (finished) => {
            'worklet';
            if (finished) {
              runOnJS(onSwipeOutComplete)(direction, swipedIndex);
            }
          }
        );
      },
      [translateX, transitionProgress, fadeOpacity, onSwipeOutComplete]
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => swipeCard('left'),
      swipeRight: () => swipeCard('right'),
      unswipe: () => {
        // Reset any in-flight animation before stepping back so the
        // re-mounted previous card doesn't inherit a fade-out value.
        resetSharedValues();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
      },
    }));

    const panGesture = Gesture.Pan()
      .onUpdate((event) => {
        'worklet';
        if (horizontalSwipe) {
          translateX.value = event.translationX;
        }
        if (verticalSwipe) {
          translateY.value = event.translationY;
        }
      })
      .onEnd((event) => {
        'worklet';
        const distanceThreshold = screenWidth * 0.25;
        const passedDistance = Math.abs(event.translationX) > distanceThreshold;
        const passedVelocity =
          Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;
        if (horizontalSwipe && (passedDistance || passedVelocity)) {
          const direction = event.translationX > 0 ? 'right' : 'left';
          runOnJS(swipeCard)(direction);
        } else {
          translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
          translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
        }
      });

    const backdropStyle = useAnimatedStyle(() => ({
      opacity: dragBackdrop
        ? interpolate(
            translateX.value,
            [-screenWidth, -screenWidth / 4, 0, screenWidth / 4, screenWidth],
            [0.32, 0.16, 0, 0.16, 0.32],
            Extrapolation.CLAMP
          )
        : 0,
    }));

    if (currentIndex >= cards.length) {
      return (
        <View
          style={[
            styles.container,
            { backgroundColor },
            containerStyle,
            useViewOverflow && { overflow: 'hidden' },
          ]}
        />
      );
    }

    const cardsToRender: React.ReactNode[] = [];
    const maxCards = Math.min(stackSize, cards.length - currentIndex);
    for (let i = maxCards - 1; i >= 0; i--) {
      const stackedCardIndex = currentIndex + i;
      if (stackedCardIndex >= cards.length) continue;
      const isTopCard = i === 0;
      const cardContent = renderCard(cards[stackedCardIndex], stackedCardIndex);
      if (isTopCard) {
        cardsToRender.push(
          <TopCard
            key={stackedCardIndex}
            translateX={translateX}
            translateY={translateY}
            fadeOpacity={fadeOpacity}
            scaleVal={scaleVal}
            cardStyle={cardStyle}
            overlayLabels={overlayLabels}
            panGesture={panGesture}
          >
            {cardContent}
          </TopCard>
        );
      } else {
        cardsToRender.push(
          <StackedCard
            key={stackedCardIndex}
            depth={i}
            stackScale={stackScale}
            stackSeparation={stackSeparation}
            stackRotationDeg={stackRotationDeg}
            stackTranslateX={stackTranslateX}
            showSecondCard={showSecondCard}
            transitionProgress={transitionProgress}
            cardStyle={cardStyle}
          >
            {cardContent}
          </StackedCard>
        );
      }
    }

    return (
      <View
        style={[
          styles.container,
          { backgroundColor },
          containerStyle,
          useViewOverflow && { overflow: 'hidden' },
        ]}
      >
        {dragBackdrop && (
          <Animated.View
            pointerEvents='none'
            style={[styles.backdrop, backdropStyle]}
          />
        )}
        {cardsToRender}
      </View>
    );
  }
);

SwipeableCardWrapper.displayName = 'SwipeableCardWrapper';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  stackedCard: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayLabel: {
    position: 'absolute',
    zIndex: 1000,
  },
  overlayLabelLeft: {
    top: '45%',
    left: 20,
  },
  overlayLabelRight: {
    top: '45%',
    right: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,1)',
    zIndex: 0,
  },
});

export default SwipeableCardWrapper;
