import React, { useEffect, useRef, memo } from 'react';
import {
  Animated,
  View,
  Easing,
  ViewStyle,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { useInteractionAware } from '../../hooks/usePerformance';

// ============================================================================
// ANIMATION TYPES
// ============================================================================

export interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  testID?: string;
}

export interface SlideInProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  testID?: string;
}

export interface ScaleInProps {
  children: React.ReactNode;
  fromScale?: number;
  toScale?: number;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  testID?: string;
}

export interface PulseProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  duration?: number;
  iterations?: number;
  style?: ViewStyle;
  testID?: string;
}

export interface BouncyPressProps {
  children: React.ReactNode;
  onPress?: () => void;
  bounceScale?: number;
  bounceDuration?: number;
  style?: ViewStyle;
  testID?: string;
}

// ============================================================================
// FADE IN ANIMATION
// ============================================================================

export const FadeIn = memo<FadeInProps>(({
  children,
  duration = 500,
  delay = 0,
  style,
  testID,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [opacity, duration, delay]);

  return (
    <Animated.View 
      style={[{ opacity }, style]} 
      testID={testID}
    >
      {children}
    </Animated.View>
  );
});

FadeIn.displayName = 'FadeIn';

// ============================================================================
// SLIDE IN ANIMATION
// ============================================================================

export const SlideIn = memo<SlideInProps>(({
  children,
  direction = 'up',
  distance = 50,
  duration = 500,
  delay = 0,
  style,
  testID,
}) => {
  const translateValue = useRef(new Animated.Value(distance)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const getTransformStyle = () => {
    switch (direction) {
      case 'up':
        return { translateY: translateValue };
      case 'down':
        return { translateY: translateValue.interpolate({
          inputRange: [0, distance],
          outputRange: [0, -distance],
        })};
      case 'left':
        return { translateX: translateValue };
      case 'right':
        return { translateX: translateValue.interpolate({
          inputRange: [0, distance],
          outputRange: [0, -distance],
        })};
      default:
        return { translateY: translateValue };
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateValue, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration * 0.8,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [translateValue, opacity, duration, delay]);

  return (
    <Animated.View 
      style={[
        {
          opacity,
          transform: [getTransformStyle()],
        },
        style
      ]} 
      testID={testID}
    >
      {children}
    </Animated.View>
  );
});

SlideIn.displayName = 'SlideIn';

// ============================================================================
// SCALE IN ANIMATION
// ============================================================================

export const ScaleIn = memo<ScaleInProps>(({
  children,
  fromScale = 0.3,
  toScale = 1,
  duration = 400,
  delay = 0,
  style,
  testID,
}) => {
  const scale = useRef(new Animated.Value(fromScale)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: toScale,
          duration,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration * 0.6,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [scale, opacity, duration, delay, fromScale, toScale]);

  return (
    <Animated.View 
      style={[
        {
          opacity,
          transform: [{ scale }],
        },
        style
      ]} 
      testID={testID}
    >
      {children}
    </Animated.View>
  );
});

ScaleIn.displayName = 'ScaleIn';

// ============================================================================
// PULSE ANIMATION
// ============================================================================

export const Pulse = memo<PulseProps>(({
  children,
  minScale = 0.95,
  maxScale = 1.05,
  duration = 1000,
  iterations = -1, // -1 for infinite
  style,
  testID,
}) => {
  const scale = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { iterations }
    );

    animation.start();

    return () => animation.stop();
  }, [scale, minScale, maxScale, duration, iterations]);

  return (
    <Animated.View 
      style={[
        {
          transform: [{ scale }],
        },
        style
      ]} 
      testID={testID}
    >
      {children}
    </Animated.View>
  );
});

Pulse.displayName = 'Pulse';

// ============================================================================
// BOUNCY PRESS ANIMATION
// ============================================================================

export const BouncyPress = memo<BouncyPressProps>(({
  children,
  onPress,
  bounceScale = 0.95,
  bounceDuration = 150,
  style,
  testID,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: bounceScale,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
        },
        style
      ]}
      testID={testID}
    >
      <View
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
        onResponderGrant={handlePressIn}
        onResponderRelease={handlePressOut}
        onResponderTerminate={handlePressOut}
        onPress={onPress}
      >
        {children}
      </View>
    </Animated.View>
  );
});

BouncyPress.displayName = 'BouncyPress';

// ============================================================================
// LAYOUT ANIMATIONS
// ============================================================================

export const LayoutAnimations = {
  easeInEaseOut: () => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  },

  spring: () => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    }
  },

  linear: () => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.linear);
    }
  },

  custom: (duration: number = 300) => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext({
        duration,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.7,
        },
        delete: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });
    }
  },
};

// ============================================================================
// SEQUENTIAL ANIMATION CONTAINER
// ============================================================================

export interface SequentialAnimationProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  animationType?: 'fade' | 'slide' | 'scale';
  style?: ViewStyle;
  testID?: string;
}

export const SequentialAnimation = memo<SequentialAnimationProps>(({
  children,
  staggerDelay = 100,
  animationType = 'fade',
  style,
  testID,
}) => {
  const renderAnimatedChild = (child: React.ReactNode, index: number) => {
    const delay = index * staggerDelay;
    const key = `animated-child-${index}`;

    switch (animationType) {
      case 'slide':
        return (
          <SlideIn key={key} delay={delay}>
            {child}
          </SlideIn>
        );
      case 'scale':
        return (
          <ScaleIn key={key} delay={delay}>
            {child}
          </ScaleIn>
        );
      case 'fade':
      default:
        return (
          <FadeIn key={key} delay={delay}>
            {child}
          </FadeIn>
        );
    }
  };

  return (
    <View style={style} testID={testID}>
      {children.map(renderAnimatedChild)}
    </View>
  );
});

SequentialAnimation.displayName = 'SequentialAnimation';

// ============================================================================
// INTERACTION-AWARE ANIMATION
// ============================================================================

export interface InteractionAwareAnimationProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  animationType?: 'fade' | 'slide' | 'scale';
  style?: ViewStyle;
  testID?: string;
}

export const InteractionAwareAnimation = memo<InteractionAwareAnimationProps>(({
  children,
  fallback,
  animationType = 'fade',
  style,
  testID,
}) => {
  const shouldAnimate = useInteractionAware(() => true, []);

  if (!shouldAnimate) {
    return (
      <View style={style} testID={testID}>
        {fallback || children}
      </View>
    );
  }

  switch (animationType) {
    case 'slide':
      return (
        <SlideIn style={style} testID={testID}>
          {children}
        </SlideIn>
      );
    case 'scale':
      return (
        <ScaleIn style={style} testID={testID}>
          {children}
        </ScaleIn>
      );
    case 'fade':
    default:
      return (
        <FadeIn style={style} testID={testID}>
          {children}
        </FadeIn>
      );
  }
});

InteractionAwareAnimation.displayName = 'InteractionAwareAnimation';

export {
  FadeIn,
  SlideIn,
  ScaleIn,
  Pulse,
  BouncyPress,
  SequentialAnimation,
  InteractionAwareAnimation,
  LayoutAnimations,
};
