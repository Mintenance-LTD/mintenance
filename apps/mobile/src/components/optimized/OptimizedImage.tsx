import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  Image,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  ImageStyle,
  ViewStyle,
  ImageResizeMode,
  Platform,
} from 'react-native';
import { useImageOptimization } from '../../hooks/usePerformance';

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: ImageResizeMode;
  placeholder?: React.ReactNode;
  errorComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: any) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  preload?: boolean;
  fade?: boolean;
  fadeDuration?: number;
  quality?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'normal' | 'high';
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
  blurRadius?: number;
}

interface ImageState {
  loading: boolean;
  error: boolean;
  loaded: boolean;
}

// ============================================================================
// OPTIMIZED IMAGE COMPONENT
// ============================================================================

export const OptimizedImage = memo<OptimizedImageProps>((props) => {
  const {
    source,
    style,
    containerStyle,
    resizeMode = 'cover',
    placeholder,
    errorComponent,
    loadingComponent,
    onLoad,
    onError,
    onLoadStart,
    onLoadEnd,
    testID,
    accessibilityLabel,
    preload = false,
    fade = true,
    fadeDuration = 300,
    quality = 'medium',
    priority = 'normal',
    cache = 'default',
    blurRadius,
  } = props;

  // ============================================================================
  // STATE & HOOKS
  // ============================================================================

  const [imageState, setImageState] = useState<ImageState>({
    loading: false,
    error: false,
    loaded: false,
  });

  const { preloadImage, isPreloaded } = useImageOptimization();

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isRemoteImage = useMemo(() => {
    return typeof source === 'object' && source.uri;
  }, [source]);

  const imageUri = useMemo(() => {
    if (typeof source === 'object' && source.uri) {
      return source.uri;
    }
    return null;
  }, [source]);

  const optimizedSource = useMemo(() => {
    if (typeof source === 'number') {
      return source; // Local image
    }

    if (!imageUri) {
      return source;
    }

    // Add quality parameters for remote images
    const url = new URL(imageUri);
    
    // Add quality parameter based on setting
    const qualityMap = { low: 60, medium: 80, high: 95 };
    url.searchParams.set('quality', qualityMap[quality].toString());
    
    // Add format optimization
    if (Platform.OS === 'ios') {
      url.searchParams.set('format', 'webp');
    }
    
    return { uri: url.toString() };
  }, [source, imageUri, quality]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleLoadStart = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      loading: true,
      error: false,
    }));
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoad = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      loading: false,
      loaded: true,
    }));
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((error: any) => {
    setImageState(prev => ({
      ...prev,
      loading: false,
      error: true,
    }));
    onError?.(error);
  }, [onError]);

  const handleLoadEnd = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      loading: false,
    }));
    onLoadEnd?.();
  }, [onLoadEnd]);

  // ============================================================================
  // PRELOADING EFFECT
  // ============================================================================

  React.useEffect(() => {
    if (preload && imageUri && !isPreloaded(imageUri)) {
      preloadImage(imageUri);
    }
  }, [preload, imageUri, preloadImage, isPreloaded]);

  // ============================================================================
  // RENDER COMPONENTS
  // ============================================================================

  const renderPlaceholder = useCallback(() => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <View style={[styles.placeholder, style]} testID={`${testID}-placeholder`}>
        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderText}>📷</Text>
        </View>
      </View>
    );
  }, [placeholder, style, testID]);

  const renderLoadingComponent = useCallback(() => {
    if (loadingComponent) {
      return loadingComponent;
    }

    return (
      <View style={[styles.loading, style]} testID={`${testID}-loading`}>
        <ActivityIndicator 
          size="small" 
          color="#007AFF"
          testID={`${testID}-loading-indicator`}
        />
      </View>
    );
  }, [loadingComponent, style, testID]);

  const renderErrorComponent = useCallback(() => {
    if (errorComponent) {
      return errorComponent;
    }

    return (
      <View style={[styles.error, style]} testID={`${testID}-error`}>
        <Text style={styles.errorText}>⚠️</Text>
        <Text style={styles.errorMessage}>Failed to load image</Text>
      </View>
    );
  }, [errorComponent, style, testID]);

  // ============================================================================
  // IMAGE STYLES
  // ============================================================================

  const imageStyles = useMemo(() => {
    const baseStyles = [styles.image, style];
    
    if (fade && imageState.loaded) {
      baseStyles.push({
        opacity: 1,
      });
    } else if (fade) {
      baseStyles.push({
        opacity: 0,
      });
    }

    return baseStyles;
  }, [style, fade, imageState.loaded]);

  const animatedStyles = useMemo(() => {
    if (!fade) return {};
    
    return {
      transition: `opacity ${fadeDuration}ms ease-in-out`,
    };
  }, [fade, fadeDuration]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const containerStyles = [styles.container, containerStyle];

  // Show placeholder while not loaded and no error
  if (!imageState.loaded && !imageState.error && !imageState.loading) {
    return (
      <View style={containerStyles} testID={testID}>
        {renderPlaceholder()}
      </View>
    );
  }

  // Show loading state
  if (imageState.loading && !imageState.loaded) {
    return (
      <View style={containerStyles} testID={testID}>
        {renderLoadingComponent()}
      </View>
    );
  }

  // Show error state
  if (imageState.error) {
    return (
      <View style={containerStyles} testID={testID}>
        {renderErrorComponent()}
      </View>
    );
  }

  // Show actual image
  return (
    <View style={containerStyles} testID={testID}>
      <Image
        source={optimizedSource}
        style={[imageStyles, animatedStyles]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
        accessibilityLabel={accessibilityLabel}
        blurRadius={blurRadius}
        testID={`${testID}-image`}
        // Performance optimizations
        {...(Platform.OS === 'android' && {
          fadeDuration: fade ? fadeDuration : 0,
        })}
        {...(Platform.OS === 'ios' && {
          resizeMethod: 'resize',
        })}
        {...(isRemoteImage && {
          cache,
          priority,
        })}
      />
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
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#CCCCCC',
  },
  loading: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 20,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: '#D32F2F',
    textAlign: 'center',
  },
});

export default OptimizedImage;
