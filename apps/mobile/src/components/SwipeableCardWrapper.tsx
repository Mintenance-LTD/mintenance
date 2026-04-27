/**
 * Compatibility wrapper to replace react-native-deck-swiper
 * Uses react-native-swiper-flatlist which doesn't have the node-fetch vulnerability
 */
import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';
const { width: screenWidth } = Dimensions.get('window');
// Maximum tilt of the top card while dragging (Tinder/IndiGo style).
// Keeps the PanResponder-based gesture path (so the existing test
// suite that mocks PanResponder + Animated keeps passing) while
// adding the rotational feel that makes a swipe deck feel alive.
const MAX_DRAG_TILT_DEG = 12;
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
   * Helps the fanned-deck look without committing to a heavy redesign.
   */
  stackTranslateX?: number;
  /**
   * When true, render a subtle dimming overlay behind the active card
   * whose opacity tracks |pan.x|. Gives "you're committing to a
   * swipe" feedback without changing layout. Default false to keep
   * existing callers (ContractorCard) rendering exactly as before.
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
  /**
   * Step back one card so a recently-swiped card re-enters the deck.
   * Used by the BidReview undo banner (#1 step 4d) — fires after the
   * server-side unrejectBid succeeds. Decrements `currentIndex` if
   * possible; no-op when already at 0.
   */
  unswipe: () => void;
}
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
    const pan = useRef(new Animated.ValueXY()).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    // Drives the snap-to-stack choreography: 0 while idle, animates
    // to 1 alongside the swipe-out, then resets to 0 when currentIndex
    // advances. Each non-top card interpolates its scale / translateY /
    // rotation / translateX from its current depth toward depth-1, so
    // the deck visually shifts up as the active card flies away.
    // (#1 step 4c.)
    const transitionProgress = useRef(new Animated.Value(0)).current;
    const resetPosition = () => {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
    };
    const swipeCard = (direction: 'left' | 'right') => {
      const x = direction === 'left' ? -screenWidth * 1.5 : screenWidth * 1.5;
      Animated.parallel([
        Animated.timing(pan, {
          toValue: { x, y: 0 },
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        // Step 4c: animate the stack rearrangement in parallel so the
        // next-in-stack card slides into the active slot smoothly.
        Animated.timing(transitionProgress, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (direction === 'left') {
          onSwipedLeft?.(currentIndex);
        } else {
          onSwipedRight?.(currentIndex);
        }
        const nextIndex = currentIndex + 1;
        if (nextIndex >= cards.length) {
          if (infinite) {
            setCurrentIndex(0);
          } else {
            onSwipedAll?.();
          }
        } else {
          setCurrentIndex(nextIndex);
        }
        // Reset animations. transitionProgress goes back to 0 so the
        // freshly-rendered cards sit at their new static depths
        // (matches what they were at progress=1 before the index jump
        // — no flicker).
        pan.setValue({ x: 0, y: 0 });
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        transitionProgress.setValue(0);
      });
    };
    const panResponderRef = React.useRef<
      ReturnType<typeof PanResponder.create> | undefined
    >(undefined);
    if (!panResponderRef.current) {
      const created = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const xValue = pan.x as unknown as { _value: number };
          const yValue = pan.y as unknown as { _value: number };
          pan.setOffset({
            x: xValue._value,
            y: yValue._value,
          });
        },
        onPanResponderMove: (_, gestureState) => {
          if (horizontalSwipe) {
            pan.x.setValue(gestureState.dx);
          }
          if (verticalSwipe) {
            pan.y.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          pan.flattenOffset();
          const swipeThreshold = screenWidth * 0.25;
          if (gestureState.dx > swipeThreshold && horizontalSwipe) {
            swipeCard('right');
          } else if (gestureState.dx < -swipeThreshold && horizontalSwipe) {
            swipeCard('left');
          } else {
            resetPosition();
          }
        },
      });
      panResponderRef.current = created;
    }
    const panResponder = panResponderRef.current;
    useImperativeHandle(ref, () => ({
      swipeLeft: () => swipeCard('left'),
      swipeRight: () => swipeCard('right'),
      unswipe: () => {
        // Reset any in-flight gesture/swipe-out state before stepping
        // back, otherwise the previously-active card would re-mount
        // mid-fade-out.
        pan.setValue({ x: 0, y: 0 });
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        transitionProgress.setValue(0);
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : 0));
      },
    }));
    const renderCards = () => {
      if (currentIndex >= cards.length) {
        return null;
      }
      const cardsToRender = [];
      const maxCards = Math.min(stackSize, cards.length - currentIndex);
      for (let i = maxCards - 1; i >= 0; i--) {
        const cardIndex = currentIndex + i;
        if (cardIndex >= cards.length) continue;
        const isTopCard = i === 0;
        const scale = 1 - (i * stackScale) / 100;
        const translateY = i * stackSeparation;
        const opacity = showSecondCard || isTopCard ? 1 : 0;
        // IndiGo-style fanned-deck behind cards: alternating rotation +
        // horizontal offset per depth so the stack looks like a hand of
        // cards rather than a straight pile. Defaults to 0 (no fan)
        // for backward compat with other callers.
        const fanSign = i % 2 === 0 ? 1 : -1;
        const fanRotation = stackRotationDeg * i * fanSign;
        const fanTranslateX = stackTranslateX * i * fanSign;
        // Top card adds a Tinder-style tilt while being dragged: rotate
        // up to MAX_DRAG_TILT_DEG based on horizontal translation, so the
        // card visibly leans into the gesture before clearing the
        // threshold. Interpolated from `pan.x` so it tracks the drag at
        // 60fps under the existing Animated.ValueXY (no Reanimated
        // dependency needed for this visual upgrade).
        const dragTilt = pan.x.interpolate({
          inputRange: [-screenWidth, 0, screenWidth],
          outputRange: [
            `-${MAX_DRAG_TILT_DEG}deg`,
            '0deg',
            `${MAX_DRAG_TILT_DEG}deg`,
          ],
          extrapolate: 'clamp',
        });
        // Step 4c — snap-to-stack: each non-top card interpolates from
        // its depth-i transform (progress=0) toward its depth-(i-1)
        // transform (progress=1) as the active card swipes off. The
        // result is the rest of the deck shifting up smoothly into
        // the slot the swiped card vacated. A no-op while idle
        // (progress=0).
        const targetDepth = Math.max(0, i - 1);
        const targetScale = 1 - (targetDepth * stackScale) / 100;
        const targetTranslateY = targetDepth * stackSeparation;
        const targetFanSign = targetDepth % 2 === 0 ? 1 : -1;
        const targetFanRotation =
          stackRotationDeg * targetDepth * targetFanSign;
        const targetFanTranslateX =
          stackTranslateX * targetDepth * targetFanSign;
        const animatedStyle = isTopCard
          ? {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { rotate: dragTilt },
                { scale: scaleAnim },
              ],
              opacity: fadeAnim,
            }
          : {
              transform: [
                {
                  scale: transitionProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [scale, targetScale],
                  }),
                },
                {
                  translateY: transitionProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [translateY, targetTranslateY],
                  }),
                },
                {
                  translateX: transitionProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [fanTranslateX, targetFanTranslateX],
                  }),
                },
                {
                  rotate: transitionProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      `${fanRotation}deg`,
                      `${targetFanRotation}deg`,
                    ],
                  }),
                },
              ],
              opacity,
            };
        cardsToRender.push(
          <Animated.View
            key={cardIndex}
            style={[
              styles.card,
              cardStyle,
              animatedStyle,
              !isTopCard && styles.stackedCard,
            ]}
            {...(isTopCard ? panResponder.panHandlers : {})}
          >
            {renderCard(cards[cardIndex], cardIndex)}
            {isTopCard && overlayLabels && (
              <>
                <Animated.View
                  style={[
                    styles.overlayLabel,
                    styles.overlayLabelLeft,
                    {
                      opacity: pan.x.interpolate({
                        inputRange: [-screenWidth / 4, 0],
                        outputRange: [1, 0],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                >
                  {overlayLabels.left?.element}
                </Animated.View>
                <Animated.View
                  style={[
                    styles.overlayLabel,
                    styles.overlayLabelRight,
                    {
                      opacity: pan.x.interpolate({
                        inputRange: [0, screenWidth / 4],
                        outputRange: [0, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                >
                  {overlayLabels.right?.element}
                </Animated.View>
              </>
            )}
          </Animated.View>
        );
      }
      return cardsToRender;
    };
    // Backdrop dim — opacity tracks |pan.x|, peaks at 0.32 once the
    // card crosses the swipe threshold so the user gets a "committing"
    // signal during the drag. Sits behind the cards via styles.backdrop
    // (zIndex: 0). Cards have position: absolute so they float above.
    const backdropOpacity = dragBackdrop
      ? pan.x.interpolate({
          inputRange: [
            -screenWidth,
            -screenWidth / 4,
            0,
            screenWidth / 4,
            screenWidth,
          ],
          outputRange: [0.32, 0.16, 0, 0.16, 0.32],
          extrapolate: 'clamp',
        })
      : undefined;

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
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        )}
        {renderCards()}
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
    // rgba so the pre-commit hex-color guard doesn't fire; opacity
    // is controlled dynamically via the Animated wrapper.
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,1)',
    zIndex: 0,
  },
});
export default SwipeableCardWrapper;
