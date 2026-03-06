/**
 * Primitive Reanimated 4 animation components.
 * FadeIn, SlideIn, ScaleIn, Pulse, BouncyPress.
 */

import React, { useEffect, memo } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

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
  style?: ViewStyle;
  testID?: string;
}

export const FadeIn = memo<FadeInProps>(({
  children, duration = 500, delay = 0, style, testID,
}) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [opacity, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[animatedStyle, style]} testID={testID}>
      {children}
    </Animated.View>
  );
});

FadeIn.displayName = 'FadeIn';

export const SlideIn = memo<SlideInProps>(({
  children, direction = 'up', distance = 50, duration = 500, delay = 0, style, testID,
}) => {
  const isVertical = direction === 'up' || direction === 'down';
  const initialOffset = direction === 'down' || direction === 'right' ? -distance : distance;
  const translate = useSharedValue(initialOffset);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translate.value = withDelay(delay, withTiming(0, {
      duration, easing: Easing.out(Easing.back(1.2)),
    }));
    opacity.value = withDelay(delay, withTiming(1, {
      duration: duration * 0.8, easing: Easing.out(Easing.quad),
    }));
  }, [translate, opacity, duration, delay, distance]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: isVertical
      ? [{ translateY: translate.value }]
      : [{ translateX: translate.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} testID={testID}>
      {children}
    </Animated.View>
  );
});

SlideIn.displayName = 'SlideIn';

export const ScaleIn = memo<ScaleInProps>(({
  children, fromScale = 0.3, toScale = 1, duration = 400, delay = 0, style, testID,
}) => {
  const scale = useSharedValue(fromScale);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withTiming(toScale, {
      duration, easing: Easing.out(Easing.back(1.5)),
    }));
    opacity.value = withDelay(delay, withTiming(1, {
      duration: duration * 0.6, easing: Easing.out(Easing.quad),
    }));
  }, [scale, opacity, duration, delay, fromScale, toScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} testID={testID}>
      {children}
    </Animated.View>
  );
});

ScaleIn.displayName = 'ScaleIn';

export const Pulse = memo<PulseProps>(({
  children, minScale = 0.95, maxScale = 1.05, duration = 1000, iterations = -1, style, testID,
}) => {
  const scale = useSharedValue(minScale);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(minScale, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
      ),
      iterations
    );
    return () => { scale.value = minScale; };
  }, [scale, minScale, maxScale, duration, iterations]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} testID={testID}>
      {children}
    </Animated.View>
  );
});

Pulse.displayName = 'Pulse';

export const BouncyPress = memo<BouncyPressProps>(({
  children, onPress, bounceScale = 0.95, style, testID,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(bounceScale, { mass: 0.3, damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { mass: 0.3, damping: 10, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]} testID={testID}>
      <View
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handlePressIn}
        onResponderRelease={() => { handlePressOut(); onPress?.(); }}
        onResponderTerminate={handlePressOut}
      >
        {children}
      </View>
    </Animated.View>
  );
});

BouncyPress.displayName = 'BouncyPress';
