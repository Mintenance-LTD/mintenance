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
interface SwipeableCardWrapperProps {
  cards: any[];
  renderCard: (item: any, index: number) => React.ReactNode;
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
}
const SwipeableCardWrapper = forwardRef<SwipeableCardRef, SwipeableCardWrapperProps>(
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
        // Reset animations
        pan.setValue({ x: 0, y: 0 });
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
      });
    };
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
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
    useImperativeHandle(ref, () => ({
      swipeLeft: () => swipeCard('left'),
      swipeRight: () => swipeCard('right'),
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
        const animatedStyle = isTopCard
          ? {
              transform: [
                ...pan.getTranslateTransform(),
                { scale: scaleAnim },
              ],
              opacity: fadeAnim,
            }
          : {
              transform: [
                { scale },
                { translateY },
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
    return (
      <View
        style={[
          styles.container,
          { backgroundColor },
          containerStyle,
          useViewOverflow && { overflow: 'hidden' },
        ]}
      >
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
});
export default SwipeableCardWrapper;