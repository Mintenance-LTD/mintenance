/**
 * ImageCarousel - Horizontal paging image carousel with dot indicators
 * Airbnb-style hero image carousel for job cards and detail screens.
 */
import React, { memo, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OptimizedImage } from '../optimized/OptimizedImage';
import { theme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ImageCarouselProps {
  images: string[];
  height?: number;
  width?: number;
  showDots?: boolean;
  gradientOverlay?: boolean;
  overlayContent?: React.ReactNode;
  onImagePress?: (index: number) => void;
  style?: ViewStyle;
  testID?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = memo(({
  images,
  height = 300,
  width,
  showDots = true,
  gradientOverlay = false,
  overlayContent,
  onImagePress,
  style,
  testID,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselWidth = width || SCREEN_WIDTH;

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / carouselWidth);
    if (index !== activeIndex && index >= 0 && index < images.length) {
      setActiveIndex(index);
    }
  }, [carouselWidth, activeIndex, images.length]);

  const renderImage = useCallback(({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      activeOpacity={onImagePress ? 0.9 : 1}
      onPress={() => onImagePress?.(index)}
      disabled={!onImagePress}
      style={{ width: carouselWidth, height }}
    >
      <OptimizedImage
        source={{ uri: item }}
        style={{ width: carouselWidth, height }}
        contentFit="cover"
        priority={index === 0 ? 'high' : 'low'}
        cachePolicy="memory-disk"
        testID={`${testID}-image-${index}`}
      />
    </TouchableOpacity>
  ), [carouselWidth, height, onImagePress, testID]);

  if (images.length === 0) return null;

  // Single image - no carousel needed
  if (images.length === 1) {
    return (
      <View style={[{ width: carouselWidth, height }, style]} testID={testID}>
        <TouchableOpacity
          activeOpacity={onImagePress ? 0.9 : 1}
          onPress={() => onImagePress?.(0)}
          disabled={!onImagePress}
          style={{ width: carouselWidth, height }}
        >
          <OptimizedImage
            source={{ uri: images[0] }}
            style={{ width: carouselWidth, height }}
            contentFit="cover"
            priority="high"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
        {gradientOverlay && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        {overlayContent && (
          <View style={styles.overlayContainer}>{overlayContent}</View>
        )}
      </View>
    );
  }

  return (
    <View style={[{ width: carouselWidth, height }, style]} testID={testID}>
      <FlatList
        data={images}
        renderItem={renderImage}
        keyExtractor={(_, i) => `carousel-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: carouselWidth,
          offset: carouselWidth * index,
          index,
        })}
      />

      {gradientOverlay && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {overlayContent && (
        <View style={styles.overlayContainer}>{overlayContent}</View>
      )}

      {showDots && images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

ImageCarousel.displayName = 'ImageCarousel';

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 4,
  },
  dotActive: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.primary,
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default ImageCarousel;
