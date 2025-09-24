import React, { memo, useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ListRenderItem,
  ViewStyle,
  TextStyle,
  RefreshControl,
  Platform,
} from 'react-native';
import { useListOptimization, useThrottled } from '../../hooks/usePerformance';

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor?: (item: T, index: number) => string;
  itemHeight?: number;
  windowHeight?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  numColumns?: number;
  horizontal?: boolean;
  estimatedItemSize?: number;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  testID?: string;
}

// ============================================================================
// OPTIMIZED LIST COMPONENT
// ============================================================================

export const OptimizedList = memo(<T extends any>(props: OptimizedListProps<T>) => {
  const {
    data,
    renderItem,
    keyExtractor: customKeyExtractor,
    itemHeight = 60,
    windowHeight = 600,
    onRefresh,
    refreshing = false,
    onEndReached,
    onEndReachedThreshold = 0.5,
    ListEmptyComponent,
    ListHeaderComponent,
    ListFooterComponent,
    style,
    contentContainerStyle,
    numColumns = 1,
    horizontal = false,
    estimatedItemSize,
    onScroll,
    scrollEventThrottle = 16,
    testID,
  } = props;

  // ============================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ============================================================================

  const listOptimization = useListOptimization(
    data?.length || 0,
    itemHeight,
    windowHeight
  );

  const keyExtractor = useCallback(
    (item: T, index: number) => {
      if (customKeyExtractor) {
        return customKeyExtractor(item, index);
      }
      return listOptimization.keyExtractor(item, index);
    },
    [customKeyExtractor, listOptimization.keyExtractor]
  );

  const getItemLayout = useCallback(
    (data: T[] | null | undefined, index: number) => {
      const height = estimatedItemSize || itemHeight;
      return {
        length: height,
        offset: height * index,
        index,
      };
    },
    [itemHeight, estimatedItemSize]
  );

  // Throttle scroll events to improve performance
  const throttledOnScroll = useThrottled(
    onScroll || (() => {}),
    scrollEventThrottle
  );

  // Throttle end reached to prevent multiple calls
  const throttledOnEndReached = useThrottled(
    onEndReached || (() => {}),
    1000 // 1 second throttle for pagination
  );

  // ============================================================================
  // MEMOIZED COMPONENTS
  // ============================================================================

  const refreshControl = useMemo(() => {
    if (!onRefresh) return undefined;
    
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor="#007AFF"
        colors={['#007AFF']}
      />
    );
  }, [onRefresh, refreshing]);

  const emptyComponent = useMemo(() => {
    if (!ListEmptyComponent) {
      return (
        <View style={styles.emptyContainer} testID={`${testID}-empty`}>
          <Text style={styles.emptyText}>No items found</Text>
        </View>
      );
    }
    
    return React.isValidElement(ListEmptyComponent) 
      ? ListEmptyComponent 
      : <ListEmptyComponent />;
  }, [ListEmptyComponent, testID]);

  const headerComponent = useMemo(() => {
    if (!ListHeaderComponent) return null;
    
    return React.isValidElement(ListHeaderComponent) 
      ? ListHeaderComponent 
      : <ListHeaderComponent />;
  }, [ListHeaderComponent]);

  const footerComponent = useMemo(() => {
    if (!ListFooterComponent) return null;
    
    return React.isValidElement(ListFooterComponent) 
      ? ListFooterComponent 
      : <ListFooterComponent />;
  }, [ListFooterComponent]);

  // ============================================================================
  // OPTIMIZED PROPS
  // ============================================================================

  const optimizedProps = useMemo(() => ({
    // Core props
    data,
    renderItem,
    keyExtractor,
    getItemLayout: !horizontal ? getItemLayout : undefined,
    
    // Performance props
    removeClippedSubviews: listOptimization.removeClippedSubviews,
    maxToRenderPerBatch: listOptimization.maxToRenderPerBatch,
    updateCellsBatchingPeriod: listOptimization.updateCellsBatchingPeriod,
    initialNumToRender: listOptimization.initialNumToRender,
    windowSize: listOptimization.windowSize,
    
    // Event props
    onScroll: onScroll ? throttledOnScroll : undefined,
    scrollEventThrottle: onScroll ? scrollEventThrottle : undefined,
    onEndReached: onEndReached ? throttledOnEndReached : undefined,
    onEndReachedThreshold,
    
    // Component props
    ListEmptyComponent: emptyComponent,
    ListHeaderComponent: headerComponent,
    ListFooterComponent: footerComponent,
    refreshControl,
    
    // Style props
    style: [styles.list, style],
    contentContainerStyle: [
      data?.length === 0 && styles.emptyContentContainer,
      contentContainerStyle,
    ],
    
    // Layout props
    numColumns,
    horizontal,
    
    // Accessibility
    testID,
    
    // Platform specific optimizations
    ...(Platform.OS === 'ios' && {
      bounces: true,
      bouncesZoom: false,
      alwaysBounceVertical: false,
      alwaysBounceHorizontal: false,
    }),
    
    ...(Platform.OS === 'android' && {
      overScrollMode: 'auto',
    }),
  }), [
    data,
    renderItem,
    keyExtractor,
    getItemLayout,
    horizontal,
    listOptimization,
    onScroll,
    throttledOnScroll,
    scrollEventThrottle,
    onEndReached,
    throttledOnEndReached,
    onEndReachedThreshold,
    emptyComponent,
    headerComponent,
    footerComponent,
    refreshControl,
    style,
    contentContainerStyle,
    numColumns,
    testID,
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return <FlatList {...optimizedProps} />;
}) as <T>(props: OptimizedListProps<T>) => JSX.Element;

OptimizedList.displayName = 'OptimizedList';

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
});

export default OptimizedList;
