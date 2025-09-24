import React, { useRef, useEffect } from 'react';
import {
  Animated,
  ViewStyle,
  TextStyle,
  Easing,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import { designTokens } from '../../../design-system/tokens';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AnimationType =
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleOut'
  | 'bounceIn'
  | 'pulse'
  | 'shake'
  | 'rotate';

export type EasingType = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'spring';

export interface AnimatedViewProps {
  children: React.ReactNode;
  animation?: AnimationType;
  duration?: number;
  delay?: number;
  easing?: EasingType;
  loop?: boolean;
  autoPlay?: boolean;
  onComplete?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export interface MicroInteractionProps {
  children: React.ReactNode;
  type: 'press' | 'hover' | 'focus' | 'loading';
  intensity?: 'subtle' | 'medium' | 'strong';
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

// ============================================================================
// ANIMATED VIEW COMPONENT
// ============================================================================

export const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  animation = 'fadeIn',
  duration = 300,
  delay = 0,
  easing = 'ease',
  loop = false,
  autoPlay = true,
  onComplete,
  style,
  testID,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const getEasing = (type: EasingType) => {
    switch (type) {
      case 'linear': return Easing.linear;
      case 'easeIn': return Easing.in(Easing.ease);
      case 'easeOut': return Easing.out(Easing.ease);
      case 'easeInOut': return Easing.inOut(Easing.ease);
      case 'bounce': return Easing.bounce;
      case 'spring': return Easing.elastic(2);
      default: return Easing.ease;
    }
  };

  const getAnimationStyle = (): ViewStyle => {
    switch (animation) {
      case 'fadeIn':
        return {
          opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        };

      case 'fadeOut':
        return {
          opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        };

      case 'slideUp':
        return {
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
          opacity: animatedValue,
        };

      case 'slideDown':
        return {
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0],
            }),
          }],
          opacity: animatedValue,
        };

      case 'slideLeft':
        return {
          transform: [{
            translateX: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            }),
          }],
          opacity: animatedValue,
        };

      case 'slideRight':
        return {
          transform: [{
            translateX: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            }),
          }],
          opacity: animatedValue,
        };

      case 'scaleIn':
        return {
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            }),
          }],
          opacity: animatedValue,
        };

      case 'scaleOut':
        return {
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.3],
            }),
          }],
          opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        };

      case 'bounceIn':
        return {
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1.2, 1],
            }),
          }],
        };

      case 'pulse':
        return {
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.1, 1],
            }),
          }],
        };

      case 'shake':
        return {
          transform: [{
            translateX: animatedValue.interpolate({
              inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
              outputRange: [0, -10, 10, -10, 10, -10, 10, -10, 10, -10, 0],
            }),
          }],
        };

      case 'rotate':
        return {
          transform: [{
            rotate: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }),
          }],
        };

      default:
        return {};
    }
  };

  const startAnimation = () => {
    const animationConfig = {
      toValue: 1,
      duration,
      delay,
      easing: getEasing(easing),
      useNativeDriver: true,
    };

    if (loop) {
      Animated.loop(
        Animated.timing(animatedValue, animationConfig),
        { resetBeforeIteration: true }
      ).start();
    } else {
      Animated.timing(animatedValue, animationConfig).start(onComplete);
    }
  };

  useEffect(() => {
    if (autoPlay) {
      startAnimation();
    }
  }, [autoPlay, animation]);

  return (
    <Animated.View
      style={[getAnimationStyle(), style]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

// ============================================================================
// MICRO-INTERACTION COMPONENT
// ============================================================================

export const MicroInteraction: React.FC<MicroInteractionProps> = ({
  children,
  type,
  intensity = 'medium',
  disabled = false,
  onPress,
  style,
  testID,
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;

  const getIntensityValues = () => {
    switch (intensity) {
      case 'subtle':
        return { scale: 0.98, opacity: 0.9, duration: 100 };
      case 'strong':
        return { scale: 0.92, opacity: 0.8, duration: 150 };
      default:
        return { scale: 0.95, opacity: 0.85, duration: 120 };
    }
  };

  const { scale, opacity, duration } = getIntensityValues();

  const animatePress = (pressed: boolean) => {
    if (disabled) return;

    const animations = [
      Animated.timing(scaleValue, {
        toValue: pressed ? scale : 1,
        duration: duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ];

    if (type === 'press') {
      animations.push(
        Animated.timing(opacityValue, {
          toValue: pressed ? opacity : 1,
          duration: duration,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  };

  const createPanResponder = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,

      onPanResponderGrant: () => {
        animatePress(true);
      },

      onPanResponderRelease: () => {
        animatePress(false);
        if (onPress) {
          // Small delay to show animation completion
          setTimeout(onPress, 50);
        }
      },

      onPanResponderTerminate: () => {
        animatePress(false);
      },
    });
  };

  const panResponder = createPanResponder();

  const getAnimatedStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      transform: [{ scale: scaleValue }],
    };

    if (type === 'press') {
      return {
        ...baseStyle,
        opacity: opacityValue,
      };
    }

    return baseStyle;
  };

  return (
    <Animated.View
      style={[getAnimatedStyle(), style]}
      {...panResponder.panHandlers}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
};

// ============================================================================
// STAGGER ANIMATION COMPONENT
// ============================================================================

export interface StaggerAnimationProps {
  children: React.ReactNode[];
  animation?: AnimationType;
  staggerDelay?: number;
  duration?: number;
  easing?: EasingType;
  style?: ViewStyle;
  testID?: string;
}

export const StaggerAnimation: React.FC<StaggerAnimationProps> = ({
  children,
  animation = 'fadeIn',
  staggerDelay = 100,
  duration = 300,
  easing = 'ease',
  style,
  testID,
}) => {
  return (
    <Animated.View style={style} testID={testID}>
      {React.Children.map(children, (child, index) => (
        <AnimatedView
          key={index}
          animation={animation}
          duration={duration}
          delay={index * staggerDelay}
          easing={easing}
        >
          {child}
        </AnimatedView>
      ))}
    </Animated.View>
  );
};

// ============================================================================
// LOADING ANIMATION COMPONENT
// ============================================================================

export interface LoadingAnimationProps {
  type?: 'pulse' | 'rotate' | 'bounce' | 'wave';
  color?: string;
  size?: number;
  speed?: 'slow' | 'normal' | 'fast';
  style?: ViewStyle;
  testID?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'pulse',
  color = designTokens.colors.primary[500],
  size = 40,
  speed = 'normal',
  style,
  testID,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const getDuration = () => {
    switch (speed) {
      case 'slow': return 1200;
      case 'fast': return 600;
      default: return 800;
    }
  };

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: getDuration(),
        easing: type === 'bounce' ? Easing.bounce : Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );

    animation.start();

    return () => animation.stop();
  }, [type, speed]);

  const getAnimatedStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      width: size,
      height: size,
      backgroundColor: color,
      borderRadius: size / 2,
    };

    switch (type) {
      case 'pulse':
        return {
          ...baseStyle,
          transform: [{
            scale: animatedValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.2, 1],
            }),
          }],
          opacity: animatedValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.7, 1, 0.7],
          }),
        };

      case 'rotate':
        return {
          ...baseStyle,
          transform: [{
            rotate: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }),
          }],
        };

      case 'bounce':
        return {
          ...baseStyle,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, -20, 0],
            }),
          }],
        };

      default:
        return baseStyle;
    }
  };

  return (
    <Animated.View
      style={[getAnimatedStyle(), style]}
      testID={testID}
    />
  );
};

export default {
  AnimatedView,
  MicroInteraction,
  StaggerAnimation,
  LoadingAnimation,
};