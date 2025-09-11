import { Animated, Easing } from 'react-native';
import { theme } from '../theme';

export class AnimationUtils {
  // Button press animation
  static createButtonPressAnimation(animatedValue: Animated.Value) {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: theme.animation.buttonPress.scale,
        duration: theme.animation.buttonPress.duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: theme.animation.buttonPress.duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
  }

  // Card hover/press animation
  static createCardPressAnimation(animatedValue: Animated.Value) {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: theme.animation.cardHover.scale,
        duration: theme.animation.cardHover.duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: theme.animation.cardHover.duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
  }

  // Icon bounce animation
  static createIconBounceAnimation(animatedValue: Animated.Value) {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: theme.animation.iconBounce.scale,
        duration: theme.animation.iconBounce.duration,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: theme.animation.iconBounce.duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
  }

  // Fade in animation
  static createFadeInAnimation(animatedValue: Animated.Value) {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: theme.animation.fadeIn.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
  }

  // Slide in from right animation
  static createSlideInAnimation(animatedValue: Animated.Value) {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration: theme.animation.slideIn.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
  }

  // Pulse animation (continuous)
  static createPulseAnimation(animatedValue: Animated.Value) {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.05,
          duration: theme.animation.pulse.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: theme.animation.pulse.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
  }

  // Like animation with heart bounce
  static createLikeAnimation(
    scaleValue: Animated.Value,
    colorValue: Animated.Value
  ) {
    return Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.3,
          duration: 150,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(colorValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]);
  }

  // Save/bookmark animation
  static createSaveAnimation(animatedValue: Animated.Value) {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.8,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(animatedValue, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);
  }

  // Staggered list animation
  static createStaggeredAnimation(
    animatedValues: Animated.Value[],
    delay: number = 100
  ) {
    const animations = animatedValues.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 300,
        delay: index * delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    return Animated.stagger(delay, animations);
  }

  // Spring bounce animation
  static createSpringBounce(animatedValue: Animated.Value) {
    return Animated.spring(animatedValue, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    });
  }

  // Shake animation (for errors)
  static createShakeAnimation(animatedValue: Animated.Value) {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]);
  }
}

// Animated TouchableOpacity component with built-in animations
export const AnimatedTouchableOpacity = Animated.createAnimatedComponent(
  require('react-native').TouchableOpacity
);

// Custom hook for button press animations
export const useButtonAnimation = () => {
  const scaleValue = new Animated.Value(1);

  const animatePress = () => {
    AnimationUtils.createButtonPressAnimation(scaleValue).start();
  };

  return {
    scaleValue,
    animatePress,
    style: { transform: [{ scale: scaleValue }] },
  };
};

// Custom hook for like animations
export const useLikeAnimation = () => {
  const scaleValue = new Animated.Value(1);
  const colorValue = new Animated.Value(0);

  const animateLike = () => {
    AnimationUtils.createLikeAnimation(scaleValue, colorValue).start();
  };

  return {
    scaleValue,
    colorValue,
    animateLike,
    style: { transform: [{ scale: scaleValue }] },
  };
};
