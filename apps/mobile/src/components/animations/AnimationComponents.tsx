/**
 * AnimationComponents — barrel file.
 *
 * Exports all primitive animations (FadeIn, SlideIn, ScaleIn, Pulse, BouncyPress)
 * from primitives.tsx, plus container utilities (SequentialAnimation,
 * InteractionAwareAnimation) and LayoutAnimations.
 */

import React, { memo } from 'react';
import { View, ViewStyle, LayoutAnimation, Platform } from 'react-native';
import { useInteractionAware } from '../../hooks/usePerformance';
import {
  FadeIn,
  SlideIn,
  ScaleIn,
  Pulse,
  BouncyPress,
} from './primitives';

export type {
  FadeInProps,
  SlideInProps,
  ScaleInProps,
  PulseProps,
  BouncyPressProps,
} from './primitives';

// ============================================================================
// LAYOUT ANIMATIONS (uses React Native LayoutAnimation — separate from Reanimated)
// ============================================================================

const LayoutAnimations = {
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
        update: { type: LayoutAnimation.Types.spring, springDamping: 0.7 },
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

const SequentialAnimation = memo<SequentialAnimationProps>(({
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
      case 'slide': return <SlideIn key={key} delay={delay}>{child}</SlideIn>;
      case 'scale': return <ScaleIn key={key} delay={delay}>{child}</ScaleIn>;
      default:      return <FadeIn  key={key} delay={delay}>{child}</FadeIn>;
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

const InteractionAwareAnimation = memo<InteractionAwareAnimationProps>(({
  children,
  fallback,
  animationType = 'fade',
  style,
  testID,
}) => {
  const shouldAnimate = useInteractionAware(() => true, []);

  if (!shouldAnimate) {
    return <View style={style} testID={testID}>{fallback || children}</View>;
  }

  switch (animationType) {
    case 'slide': return <SlideIn style={style} testID={testID}>{children}</SlideIn>;
    case 'scale': return <ScaleIn style={style} testID={testID}>{children}</ScaleIn>;
    default:      return <FadeIn  style={style} testID={testID}>{children}</FadeIn>;
  }
});

InteractionAwareAnimation.displayName = 'InteractionAwareAnimation';

// ============================================================================
// EXPORTS
// ============================================================================

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
