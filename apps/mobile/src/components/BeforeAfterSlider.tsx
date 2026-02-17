/**
 * BeforeAfterSlider Component
 *
 * Draggable slider that overlays before/after photos for comparison.
 * Used in HomeownerPhotoReview to verify job completion quality.
 */

import React, { useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Text,
} from 'react-native';
import { theme } from '../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SLIDER_PADDING = 32;
const IMAGE_WIDTH = SCREEN_WIDTH - SLIDER_PADDING * 2;

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
  const sliderPosition = useRef(new Animated.Value(IMAGE_WIDTH / 2)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newX = IMAGE_WIDTH / 2 + gestureState.dx;
        const clamped = Math.max(20, Math.min(IMAGE_WIDTH - 20, newX));
        sliderPosition.setValue(clamped);
      },
    })
  ).current;

  const clipWidth = sliderPosition.interpolate({
    inputRange: [0, IMAGE_WIDTH],
    outputRange: [0, IMAGE_WIDTH],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[styles.container, { height }]}
      accessibilityLabel="Before and after photo comparison. Drag the slider to compare."
      accessibilityRole="adjustable"
    >
      {/* After photo (full width, behind) */}
      <Image source={{ uri: afterUrl }} style={[styles.image, { height }]} resizeMode="cover" />

      {/* Before photo (clipped from left) */}
      <Animated.View style={[styles.beforeContainer, { width: clipWidth, height }]}>
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

      {/* Slider handle */}
      <Animated.View
        style={[styles.sliderLine, { left: clipWidth }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderHandle}>
          <View style={styles.sliderArrows}>
            <Text style={styles.arrowText}>{'◄ ►'}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: IMAGE_WIDTH,
    borderRadius: 16,
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
  labelLeft: {
    left: 12,
  },
  labelRight: {
    right: 12,
  },
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
  sliderArrows: {
    flexDirection: 'row',
  },
  arrowText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
});

export default BeforeAfterSlider;
