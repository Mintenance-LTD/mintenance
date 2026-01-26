import React, { useCallback, useMemo } from 'react';
import { logger } from '@mintenance/shared';
import {
  FlatList,
  FlatListProps,
  View,
  StyleSheet,
  Platform,
  ListRenderItem,
  ViewToken,
} from 'react-native';

/**
 * OptimizedFlatList - Performance-optimized FlatList for mintenance mobile app
 *
 * This component provides all necessary performance optimizations for smooth scrolling
 * on both iOS and Android devices. It includes:
 *
 * - Memory optimization via removeClippedSubviews
 * - Batch rendering control for smooth scrolling
 * - Optimized window size for memory management
 * - Automatic keyExtractor optimization
 * - Platform-specific optimizations
 * - Built-in scroll performance tracking
 *
 * Usage:
 * ```tsx
 * <OptimizedFlatList
 *   data={items}
 *   renderItem={renderItem}
 *   estimatedItemSize={100} // Optional: helps with getItemLayout
 * />
 * ```
 */

interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'getItemLayout'> {
  /**
   * Estimated item size for better scroll performance.
   * If all items have the same height, provide this for optimal performance.
   */
  estimatedItemSize?: number;

  /**
   * Enable debug mode to log performance metrics
   */
  debugPerformance?: boolean;

  /**
   * Custom batch size for rendering (default: 10)
   */
  batchSize?: number;

  /**
   * Custom window size multiplier (default: 10)
   */
  windowMultiplier?: number;
}

function OptimizedFlatListComponent<T = any>(
  props: OptimizedFlatListProps<T>,
  ref: React.Ref<FlatList<T>>
) {
  const {
    data,
    renderItem,
    keyExtractor,
    estimatedItemSize,
    debugPerformance = false,
    batchSize = 10,
    windowMultiplier = 10,
    onViewableItemsChanged,
    viewabilityConfig,
    // Extract props we'll override
    removeClippedSubviews,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    initialNumToRender,
    windowSize,
    getItemLayout,
    maintainVisibleContentPosition,
    ...restProps
  } = props;

  // Memoized key extractor with fallback
  const optimizedKeyExtractor = useCallback(
    (item: T, index: number) => {
      if (keyExtractor) {
        return keyExtractor(item, index);
      }
      // Fallback: try common id properties
      if (typeof item === 'object' && item !== null) {
        if ('id' in item) return String((item as any).id);
        if ('_id' in item) return String((item as any)._id);
        if ('key' in item) return String((item as any).key);
      }
      return String(index);
    },
    [keyExtractor]
  );

  // Optimized getItemLayout if estimatedItemSize is provided
  const optimizedGetItemLayout = useMemo(() => {
    if (getItemLayout) return getItemLayout;
    if (!estimatedItemSize) return undefined;

    return (_data: ArrayLike<T> | null | undefined, index: number) => ({
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    });
  }, [estimatedItemSize, getItemLayout]);

  // Performance tracking for debug mode
  const handleViewableItemsChanged = useCallback(
    (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      if (debugPerformance) {
        logger.info('[OptimizedFlatList] Viewable items:', {
          viewable: info.viewableItems.length,
          changed: info.changed.length,
          firstItem: info.viewableItems[0]?.index,
          lastItem: info.viewableItems[info.viewableItems.length - 1]?.index,
          service: 'ui'
        });
      }
      onViewableItemsChanged?.(info);
    },
    [debugPerformance, onViewableItemsChanged]
  );

  // Optimized viewability config
  const optimizedViewabilityConfig = useMemo(
    () =>
      viewabilityConfig || {
        minimumViewTime: 250,
        viewAreaCoveragePercentThreshold: 50,
        waitForInteraction: true,
      },
    [viewabilityConfig]
  );

  // Platform-specific optimizations
  const platformOptimizations = useMemo(() => {
    const isAndroid = Platform.OS === 'android';
    const isLowEndDevice = Platform.OS === 'android' && Platform.Version < 28;

    return {
      // Android benefits more from removing clipped subviews
      removeClippedSubviews: removeClippedSubviews ?? isAndroid,

      // Adjust batch size based on platform and device capability
      maxToRenderPerBatch: maxToRenderPerBatch ?? (isLowEndDevice ? 5 : batchSize),

      // Longer batching period on low-end devices
      updateCellsBatchingPeriod: updateCellsBatchingPeriod ?? (isLowEndDevice ? 100 : 50),

      // Fewer initial items on low-end devices
      initialNumToRender: initialNumToRender ?? (isLowEndDevice ? 5 : 10),

      // Smaller window on low-end devices to save memory
      windowSize: windowSize ?? (isLowEndDevice ? 5 : windowMultiplier),

      // iOS-specific: maintain visible content position for better UX
      maintainVisibleContentPosition:
        maintainVisibleContentPosition ??
        (Platform.OS === 'ios'
          ? {
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }
          : undefined),
    };
  }, [
    removeClippedSubviews,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    initialNumToRender,
    windowSize,
    maintainVisibleContentPosition,
    batchSize,
    windowMultiplier,
  ]);

  // Log performance metrics in debug mode
  React.useEffect(() => {
    if (debugPerformance && data) {
      logger.info('[OptimizedFlatList] Mounted with:', {
        dataLength: data.length,
        estimatedItemSize,
        ...platformOptimizations,
        service: 'ui'
      });
    }
  }, [debugPerformance, data?.length, estimatedItemSize, platformOptimizations]);

  return (
    <FlatList
      ref={ref}
      data={data}
      renderItem={renderItem}
      keyExtractor={optimizedKeyExtractor}
      getItemLayout={optimizedGetItemLayout}
      onViewableItemsChanged={
        debugPerformance || onViewableItemsChanged
          ? handleViewableItemsChanged
          : undefined
      }
      viewabilityConfig={optimizedViewabilityConfig}
      {...platformOptimizations}
      {...restProps}
      // Performance best practices
      scrollEventThrottle={16} // 60fps
      decelerationRate="fast"
      // Disable unnecessary features
      disableVirtualization={false}
      directionalLockEnabled={true}
      // Enable scroll performance optimization
      scrollPerfTag="OptimizedFlatList"
    />
  );
}

// Export with forwardRef support
export const OptimizedFlatList = React.forwardRef(OptimizedFlatListComponent) as <T = any>(
  props: OptimizedFlatListProps<T> & { ref?: React.Ref<FlatList<T>> }
) => React.ReactElement;

// Helper hook for common FlatList optimizations
export function useOptimizedRenderItem<T>(
  renderFn: (item: T, index: number) => React.ReactElement,
  deps: React.DependencyList = []
): ListRenderItem<T> {
  return useCallback(
    ({ item, index }) => renderFn(item, index),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

// Helper to create memoized item separators
export function useItemSeparator(
  height: number = 1,
  color: string = '#e0e0e0'
): React.ComponentType<any> {
  return useMemo(
    () =>
      React.memo(() => (
        <View style={{ height, backgroundColor: color }} />
      )),
    [height, color]
  );
}

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
});

export default OptimizedFlatList;