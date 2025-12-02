/**
 * Skeleton Component (React Native)
 *
 * Mobile skeleton loader with shimmer effect using expo-linear-gradient.
 * Provides smooth loading states for React Native components.
 *
 * Features:
 * - Shimmer animation using LinearGradient
 * - Respects AccessibilityInfo.isReduceMotionEnabled
 * - Configurable dimensions and border radius
 * - Dark mode support
 *
 * @example
 * // Basic skeleton
 * <Skeleton width={200} height={20} />
 *
 * // Circle skeleton
 * <Skeleton width={48} height={48} borderRadius={24} />
 *
 * // Custom styling
 * <Skeleton width="100%" height={100} borderRadius={16} />
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, AccessibilityInfo, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface SkeletonProps {
  /**
   * Width of the skeleton
   * Can be a number (in pixels) or a string (percentage)
   */
  width?: number | string;

  /**
   * Height of the skeleton
   * Can be a number (in pixels) or a string (percentage)
   */
  height?: number | string;

  /**
   * Border radius
   * @default 8
   */
  borderRadius?: number;

  /**
   * Whether the shimmer animation is enabled
   * @default true
   */
  animate?: boolean;

  /**
   * Background color
   * @default '#E5E7EB'
   */
  backgroundColor?: string;

  /**
   * Shimmer color
   * @default '#F3F4F6'
   */
  shimmerColor?: string;

  /**
   * Additional styles
   */
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = 100,
  height = 20,
  borderRadius = 8,
  animate = true,
  backgroundColor = '#E5E7EB',
  shimmerColor = '#F3F4F6',
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    // Check if reduced motion is enabled
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReduceMotion(enabled);
    });
  }, []);

  useEffect(() => {
    if (animate && !reduceMotion) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      shimmerAnimation.start();

      return () => {
        shimmerAnimation.stop();
      };
    }
  }, [animate, animatedValue, reduceMotion]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.container,
        {
          width: typeof width === 'string' ? width : width,
          height: typeof height === 'string' ? height : height,
          borderRadius,
          backgroundColor,
          overflow: 'hidden',
        },
        style,
      ]}
      accessible={true}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {animate && !reduceMotion && (
        <Animated.View
          style={[
            styles.shimmerContainer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', shimmerColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmer}
          />
        </Animated.View>
      )}
    </View>
  );
};

/**
 * Group of skeleton elements with consistent spacing
 */
export interface SkeletonGroupProps {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  children,
  gap = 12,
  style,
}) => {
  return (
    <View style={[{ gap }, style]}>
      {children}
    </View>
  );
};

/**
 * Pre-built skeleton for text content
 */
export interface SkeletonTextProps extends Omit<SkeletonProps, 'width' | 'height'> {
  lines?: number;
  lineHeight?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = 16,
  ...props
}) => {
  return (
    <SkeletonGroup gap={8}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '80%' : '100%'}
          height={lineHeight}
          {...props}
        />
      ))}
    </SkeletonGroup>
  );
};

/**
 * Pre-built skeleton for avatars
 */
export interface SkeletonAvatarProps extends Omit<SkeletonProps, 'width' | 'height' | 'borderRadius'> {
  size?: number;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
  ...props
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      {...props}
    />
  );
};

/**
 * Pre-built skeleton for buttons
 */
export interface SkeletonButtonProps extends Omit<SkeletonProps, 'width' | 'height'> {
  size?: 'sm' | 'md' | 'lg';
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  size = 'md',
  ...props
}) => {
  const sizes = {
    sm: { width: 80, height: 36 },
    md: { width: 100, height: 44 },
    lg: { width: 140, height: 52 },
  };

  return <Skeleton {...sizes[size]} borderRadius={12} {...props} />;
};

/**
 * Pre-built skeleton for images
 */
export interface SkeletonImageProps extends Omit<SkeletonProps, 'height'> {
  aspectRatio?: number;
}

export const SkeletonImage: React.FC<SkeletonImageProps> = ({
  aspectRatio = 16 / 9,
  width = '100%',
  ...props
}) => {
  const getHeight = () => {
    if (typeof width === 'number') {
      return width / aspectRatio;
    }
    return 200; // Default height for percentage widths
  };

  return (
    <Skeleton
      width={width}
      height={getHeight()}
      borderRadius={12}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmer: {
    width: 200,
    height: '100%',
  },
});

export default Skeleton;
