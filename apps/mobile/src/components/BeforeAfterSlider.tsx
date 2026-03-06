/**
 * BeforeAfterSlider Component
 *
 * Draggable slider that overlays before/after photos for comparison.
 * Uses Reanimated 4 shared values + react-native-gesture-handler for
 * fully native-thread gesture handling at 60fps.
 */

import React from 'react';
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { theme } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_PADDING = 32;
const IMAGE_WIDTH = SCREEN_WIDTH - SLIDER_PADDING * 2;
const CLAMP_MIN = 20;
const CLAMP_MAX = IMAGE_WIDTH - 20;

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  height?: number;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  height = 300,
}) => {
  // Track slider position; starts at midpoint
  const sliderX = useSharedValue(IMAGE_WIDTH / 2);
  // Record where the gesture began so we can offset correctly
  const startX = useSharedValue(IMAGE_WIDTH / 2);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      startX.value = sliderX.value;
    })
    .onUpdate((event) => {
      'worklet';
      const next = startX.value + event.translationX;
      sliderX.value = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, next));
    });

  const beforeClipStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }));

  const sliderLineStyle = useAnimatedStyle(() => ({
    left: sliderX.value,
  }));

  return (
    <View
      style={[styles.container, { height }]}
      accessibilityLabel="Before and after photo comparison. Drag the slider to compare."
      accessibilityRole="adjustable"
    >
      {/* After photo — full width, sits behind */}
      <Image source={{ uri: afterUrl }} style={[styles.image, { height }]} resizeMode="cover" />

      {/* Before photo — clipped from left by slider position */}
      <Animated.View style={[styles.beforeContainer, beforeClipStyle, { height }]}>
        <Image
          source={{ uri: beforeUrl }}
          style={[styles.image, { width: IMAGE_WIDTH, height }]}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Labels */}
      <View style={[styles.label, styles.labelLeft]}>
        <Text style={styles.labelText}>Before</Text>
      </View>
      <View style={[styles.label, styles.labelRight]}>
        <Text style={styles.labelText}>After</Text>
      </View>

      {/* Slider handle — wrapped in GestureDetector for native-thread pan */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sliderLine, sliderLineStyle]}>
          <View style={styles.sliderHandle}>
            <View style={styles.sliderArrows}>
              <Text style={styles.arrowText}>{'◄ ►'}</Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: IMAGE_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  image: {
    width: IMAGE_WIDTH,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  beforeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelLeft: { left: 12 },
  labelRight: { right: 12 },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  sliderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.white,
    marginLeft: -1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderHandle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.base,
  },
  sliderArrows: { flexDirection: 'row' },
  arrowText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
});

export default BeforeAfterSlider;
