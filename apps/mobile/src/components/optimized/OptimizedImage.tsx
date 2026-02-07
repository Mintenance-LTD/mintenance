import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import { Image, ImageContentFit, ImageTransition } from 'expo-image';

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizedImageProps {
  source: { uri: string } | number | string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  contentFit?: ImageContentFit;
  placeholder?: React.ReactNode | string;
  placeholderContentFit?: ImageContentFit;
  errorComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: unknown) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  transition?: ImageTransition;
  quality?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  blurRadius?: number;
  /** expo-image blurhash for fast placeholder */
  blurhash?: string;
  /** Use recycling for better list performance */
  recyclingKey?: string;
}

interface ImageState {
  loading: boolean;
  error: boolean;
  loaded: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const QUALITY_MAP = { low: 60, medium: 80, high: 95 } as const;

const DEFAULT_TRANSITION: ImageTransition = {
  duration: 300,
  effect: 'cross-dissolve',
};

// ============================================================================
// OPTIMIZED IMAGE COMPONENT
// ============================================================================

export const OptimizedImage = memo<OptimizedImageProps>((props) => {
  const {
    source,
    style,
    containerStyle,
    contentFit = 'cover',
    placeholder,
    placeholderContentFit = 'cover',
    errorComponent,
    loadingComponent,
    onLoad,
    onError,
    onLoadStart,
    onLoadEnd,
    testID,
    accessibilityLabel,
    transition = DEFAULT_TRANSITION,
    quality = 'medium',
    priority = 'normal',
    cachePolicy = 'memory-disk',
    blurRadius,
    blurhash,
    recyclingKey,
  } = props;

  // ============================================================================
  // STATE
  // ============================================================================

  const [imageState, setImageState] = useState<ImageState>({
    loading: false,
    error: false,
    loaded: false,
  });

  // ============================================================================
  // COMPUTED SOURCE
  // ============================================================================

  const optimizedSource = useMemo(() => {
    if (typeof source === 'number') {
      return source; // Local require() image
    }

    if (typeof source === 'string') {
      return { uri: source };
    }

    if (typeof source === 'object' && source.uri) {
      // Safely attempt to add quality param for remote URLs
      try {
        const url = new URL(source.uri);
        url.searchParams.set('quality', QUALITY_MAP[quality].toString());
        return { uri: url.toString() };
      } catch {
        // Malformed URI - use as-is (relative paths, data URIs, etc.)
        return source;
      }
    }

    return source;
  }, [source, quality]);

  // ============================================================================
  // EXPO-IMAGE PLACEHOLDER
  // ============================================================================

  const expoPlaceholder = useMemo(() => {
    if (blurhash) {
      return { blurhash };
    }
    return undefined;
  }, [blurhash]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleLoadStart = useCallback(() => {
    setImageState({ loading: true, error: false, loaded: false });
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoad = useCallback(() => {
    setImageState({ loading: false, error: false, loaded: true });
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(
    (error: unknown) => {
      setImageState({ loading: false, error: true, loaded: false });
      onError?.(error);
    },
    [onError],
  );

  const handleLoadEnd = useCallback(() => {
    setImageState((prev) => ({ ...prev, loading: false }));
    onLoadEnd?.();
  }, [onLoadEnd]);

  // ============================================================================
  // OVERLAY RENDERERS
  // ============================================================================

  const renderLoadingOverlay = useCallback(() => {
    if (!imageState.loading || imageState.loaded) return null;

    if (loadingComponent) {
      return (
        <View style={StyleSheet.absoluteFill}>{loadingComponent}</View>
      );
    }

    return (
      <View
        style={[StyleSheet.absoluteFill, styles.loading]}
        testID={testID ? `${testID}-loading` : undefined}
      >
        <ActivityIndicator
          size="small"
          color="#3B82F6"
          testID={testID ? `${testID}-loading-indicator` : undefined}
        />
      </View>
    );
  }, [imageState.loading, imageState.loaded, loadingComponent, testID]);

  const renderErrorOverlay = useCallback(() => {
    if (!imageState.error) return null;

    if (errorComponent) {
      return (
        <View style={StyleSheet.absoluteFill}>{errorComponent}</View>
      );
    }

    return (
      <View
        style={[StyleSheet.absoluteFill, styles.error]}
        testID={testID ? `${testID}-error` : undefined}
      >
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorMessage}>Failed to load image</Text>
      </View>
    );
  }, [imageState.error, errorComponent, testID]);

  const renderCustomPlaceholder = useCallback(() => {
    if (imageState.loaded || imageState.error || imageState.loading) return null;
    if (!placeholder) return null;

    if (typeof placeholder === 'string') {
      return (
        <View
          style={[StyleSheet.absoluteFill, styles.placeholder]}
          testID={testID ? `${testID}-placeholder` : undefined}
        >
          <Text style={styles.placeholderText}>{placeholder}</Text>
        </View>
      );
    }

    return (
      <View style={StyleSheet.absoluteFill}>{placeholder}</View>
    );
  }, [imageState.loaded, imageState.error, imageState.loading, placeholder, testID]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // The Image is ALWAYS mounted so loading can start.
  // Loading/error/placeholder are rendered as overlays on top.
  return (
    <View
      style={[styles.container, containerStyle]}
      testID={testID}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
      {!imageState.error && (
        <Image
          source={optimizedSource}
          style={[styles.image, style]}
          contentFit={contentFit}
          placeholder={expoPlaceholder}
          placeholderContentFit={placeholderContentFit}
          transition={transition}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
          onLoadEnd={handleLoadEnd}
          accessibilityLabel={accessibilityLabel}
          blurRadius={blurRadius}
          cachePolicy={cachePolicy}
          priority={priority}
          recyclingKey={recyclingKey}
          testID={testID ? `${testID}-image` : undefined}
        />
      )}

      {renderCustomPlaceholder()}
      {renderLoadingOverlay()}
      {renderErrorOverlay()}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  loading: {
    backgroundColor: 'rgba(243, 244, 246, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 14,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
});

export default OptimizedImage;
