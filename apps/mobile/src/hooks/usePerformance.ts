import { useCallback, useMemo, useRef, useEffect } from 'react';
import { InteractionManager, Platform } from 'react-native';
import { logger } from '../utils/logger';

// ============================================================================
// PERFORMANCE MONITORING HOOKS
// ============================================================================

/**
 * Hook to defer expensive operations until after interactions are complete
 * Prevents blocking user interactions during heavy computations
 */
export const useInteractionAware = <T>(
  factory: () => T,
  deps: React.DependencyList
): T | null => {
  const [result, setResult] = React.useState<T | null>(null);
  const isInteractionCompleteRef = useRef(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      isInteractionCompleteRef.current = true;
      setResult(factory());
    });

    return () => {
      handle.cancel();
      isInteractionCompleteRef.current = false;
    };
  }, deps);

  return result;
};

/**
 * Optimized version of useMemo that only recalculates after interactions
 * Useful for expensive computations that can be deferred
 */
export const useInteractionMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T | null => {
  return useInteractionAware(factory, deps);
};

/**
 * Hook to debounce expensive operations
 * Prevents excessive re-renders during rapid state changes
 */
export const useDebounced = <T>(
  value: T,
  delay: number = 300
): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook to throttle expensive operations
 * Limits the frequency of function calls
 */
export const useThrottled = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T => {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
};

/**
 * Hook to measure component render performance
 * Useful for identifying performance bottlenecks
 */
export const useRenderMetrics = (componentName: string) => {
  const renderCount = useRef(0);
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
  });

  useEffect(() => {
    renderStartTime.current = Date.now();

    return () => {
      const renderTime = Date.now() - renderStartTime.current;
      if (__DEV__ && renderTime > 16) { // 16ms = 60fps threshold
        logger.warn(
          `${componentName} render took ${renderTime}ms (render #${renderCount.current})`
        );
      }
    };
  });

  return {
    renderCount: renderCount.current,
    getRenderTime: () => Date.now() - renderStartTime.current,
  };
};

/**
 * Hook for optimized list rendering with window/virtualization awareness
 */
export const useListOptimization = (
  itemCount: number,
  itemHeight: number = 60,
  windowHeight: number = 600
) => {
  const visibleItemCount = useMemo(() => {
    return Math.ceil(windowHeight / itemHeight) + 2; // +2 for buffer
  }, [windowHeight, itemHeight]);

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => {
      return item?.id?.toString() || index.toString();
    },
    []
  );

  return {
    visibleItemCount,
    getItemLayout,
    keyExtractor,
    // Optimized FlatList props
    removeClippedSubviews: Platform.OS === 'android',
    maxToRenderPerBatch: visibleItemCount,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: visibleItemCount,
    windowSize: 10,
  };
};

// ============================================================================
// MEMORY MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook to automatically clean up resources when component unmounts
 */
export const useCleanup = (cleanup: () => void) => {
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
};

/**
 * Hook to cache expensive computations with size limits
 */
export const useMemoCache = <T>(
  factory: () => T,
  deps: React.DependencyList,
  maxSize: number = 10
) => {
  const cache = useRef<Map<string, { value: T; timestamp: number }>>(new Map());
  
  const key = useMemo(() => {
    return JSON.stringify(deps);
  }, deps);

  return useMemo(() => {
    const cached = cache.current.get(key);
    
    if (cached) {
      return cached.value;
    }

    const value = factory();
    
    // Clean old entries if cache is full
    if (cache.current.size >= maxSize) {
      const entries = Array.from(cache.current.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest half
      const toRemove = entries.slice(0, Math.floor(maxSize / 2));
      toRemove.forEach(([k]) => cache.current.delete(k));
    }
    
    cache.current.set(key, { value, timestamp: Date.now() });
    return value;
  }, [key, factory, maxSize]);
};

/**
 * Hook for image loading optimization
 */
export const useImageOptimization = () => {
  const preloadedImages = useRef<Set<string>>(new Set());
  
  const preloadImage = useCallback((uri: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImages.current.has(uri)) {
        resolve();
        return;
      }

      const image = new Image();
      image.onload = () => {
        preloadedImages.current.add(uri);
        resolve();
      };
      image.onerror = reject;
      image.src = uri;
    });
  }, []);

  const preloadImages = useCallback(async (uris: string[]) => {
    const promises = uris.map(uri => preloadImage(uri));
    return Promise.allSettled(promises);
  }, [preloadImage]);

  const isPreloaded = useCallback((uri: string) => {
    return preloadedImages.current.has(uri);
  }, []);

  return {
    preloadImage,
    preloadImages,
    isPreloaded,
  };
};

// ============================================================================
// ASYNC OPERATION HOOKS
// ============================================================================

/**
 * Hook for safe async operations that won't cause memory leaks
 */
export const useSafeAsync = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      const result = await asyncFn();
      return isMountedRef.current ? result : null;
    } catch (error) {
      if (isMountedRef.current) {
        throw error;
      }
      return null;
    }
  }, []);

  return { safeAsync, isMounted: () => isMountedRef.current };
};

/**
 * Hook for batch processing operations
 */
export const useBatchProcessor = <T, R>(
  processor: (items: T[]) => Promise<R[]>,
  batchSize: number = 10,
  delay: number = 100
) => {
  const queue = useRef<T[]>([]);
  const processing = useRef<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processQueue = useCallback(async () => {
    if (processing.current || queue.current.length === 0) {
      return;
    }

    processing.current = true;
    const batch = queue.current.splice(0, batchSize);
    
    try {
      await processor(batch);
    } catch (error) {
      logger.error('Batch processing error', error);
    } finally{
      processing.current = false;
      
      // Process remaining items
      if (queue.current.length > 0) {
        timeoutRef.current = setTimeout(processQueue, delay);
      }
    }
  }, [processor, batchSize, delay]);

  const addToQueue = useCallback((items: T | T[]) => {
    const itemsArray = Array.isArray(items) ? items : [items];
    queue.current.push(...itemsArray);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(processQueue, delay);
  }, [processQueue, delay]);

  const clearQueue = useCallback(() => {
    queue.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useCleanup(() => {
    clearQueue();
  });

  return {
    addToQueue,
    clearQueue,
    queueSize: queue.current.length,
    isProcessing: processing.current,
  };
};

export default {
  useInteractionAware,
  useInteractionMemo,
  useDebounced,
  useThrottled,
  useRenderMetrics,
  useListOptimization,
  useCleanup,
  useMemoCache,
  useImageOptimization,
  useSafeAsync,
  useBatchProcessor,
};