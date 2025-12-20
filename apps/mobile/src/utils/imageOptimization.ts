/**
 * Image Optimization Utilities
 * Lazy loading, progressive loading, caching, and optimization
 */

import { Image } from 'react-native';
import { logger } from './logger';
import { performanceMonitor } from './performance';
import { cacheService } from '../services/CacheService';

// Image quality presets
export const IMAGE_QUALITY = {
  THUMBNAIL: 0.3,
  LOW: 0.5,
  MEDIUM: 0.7,
  HIGH: 0.85,
  ORIGINAL: 1.0,
} as const;

// Image size presets (width in pixels)
export const IMAGE_SIZES = {
  THUMBNAIL: 150,
  SMALL: 320,
  MEDIUM: 640,
  LARGE: 1024,
  XLARGE: 1920,
} as const;

// Image cache configuration
const IMAGE_CACHE_CONFIG = {
  TTL: 1000 * 60 * 60 * 24 * 7, // 7 days
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  PREFETCH_THRESHOLD: 3, // Prefetch images within 3 viewports
} as const;

interface ImageOptimizationOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
  cache?: boolean;
  placeholder?: string;
}

interface ImageMetadata {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
  cached: boolean;
}

/**
 * Optimize image URL with Supabase transformations
 */
export const optimizeImageUrl = (
  url: string,
  options: ImageOptimizationOptions = {}
): string => {
  const {
    quality = IMAGE_QUALITY.MEDIUM,
    width,
    height,
    format,
    progressive = true,
  } = options;

  // Skip optimization for non-Supabase URLs
  if (!url.includes('supabase.co')) {
    return url;
  }

  // Build transformation URL
  const params = new URLSearchParams();

  if (width) params.set('width', width.toString());
  if (height) params.set('height', height.toString());
  if (quality !== 1.0) params.set('quality', Math.round(quality * 100).toString());
  if (format) params.set('format', format);
  if (progressive) params.set('progressive', 'true');

  const transformParams = params.toString();
  if (!transformParams) return url;

  // Append transformation parameters
  return `${url}${url.includes('?') ? '&' : '?'}${transformParams}`;
};

/**
 * Prefetch image and cache it
 */
export const prefetchImage = async (
  url: string,
  options: ImageOptimizationOptions = {}
): Promise<void> => {
  const startTime = Date.now();

  try {
    const optimizedUrl = optimizeImageUrl(url, options);

    // Check if already cached
    const cached = await cacheService.get<string>(`image:${optimizedUrl}`);
    if (cached) {
      logger.debug('Image already cached', { url: optimizedUrl });
      return;
    }

    // Prefetch using React Native's Image.prefetch
    await Image.prefetch(optimizedUrl);

    // Cache the URL
    if (options.cache !== false) {
      await cacheService.set(
        `image:${optimizedUrl}`,
        optimizedUrl,
        IMAGE_CACHE_CONFIG.TTL
      );
    }

    const duration = Date.now() - startTime;

    logger.debug('Image prefetched', { url: optimizedUrl, duration });
    performanceMonitor.recordMetric('image_prefetch', duration, 'custom');
  } catch (error) {
    logger.error('Image prefetch failed', error as Error);
  }
};

/**
 * Prefetch multiple images
 */
export const prefetchImages = async (
  urls: string[],
  options: ImageOptimizationOptions = {}
): Promise<void> => {
  const startTime = Date.now();

  logger.info('Prefetching images', { count: urls.length });

  await Promise.allSettled(
    urls.map(url => prefetchImage(url, options))
  );

  const duration = Date.now() - startTime;

  logger.info('Images prefetched', { count: urls.length, duration });
  performanceMonitor.recordMetric('images_prefetch_batch', duration, 'custom');
};

/**
 * Get image size (width and height)
 */
export const getImageSize = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      url,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
};

/**
 * Get image metadata
 */
export const getImageMetadata = async (url: string): Promise<ImageMetadata> => {
  try {
    const { width, height } = await getImageSize(url);
    const cached = await cacheService.has(`image:${url}`);

    // Estimate size (rough approximation)
    const estimatedSize = width * height * 3; // RGB bytes

    return {
      url,
      width,
      height,
      size: estimatedSize,
      format: url.split('.').pop()?.toLowerCase() || 'unknown',
      cached,
    };
  } catch (error) {
    logger.error('Failed to get image metadata', error as Error);
    throw error;
  }
};

/**
 * Generate responsive image sources
 */
export const generateResponsiveSources = (
  url: string,
  sizes: number[] = [
    IMAGE_SIZES.SMALL,
    IMAGE_SIZES.MEDIUM,
    IMAGE_SIZES.LARGE,
  ]
): Array<{ url: string; width: number }> => {
  return sizes.map(width => ({
    url: optimizeImageUrl(url, { width, quality: IMAGE_QUALITY.MEDIUM }),
    width,
  }));
};

/**
 * Generate thumbnail URL
 */
export const generateThumbnail = (
  url: string,
  size: number = IMAGE_SIZES.THUMBNAIL
): string => {
  return optimizeImageUrl(url, {
    width: size,
    height: size,
    quality: IMAGE_QUALITY.THUMBNAIL,
    format: 'jpeg',
  });
};

/**
 * Progressive image loading strategy
 */
export interface ProgressiveImageSources {
  placeholder: string;
  thumbnail: string;
  medium: string;
  full: string;
}

export const generateProgressiveSources = (url: string): ProgressiveImageSources => {
  return {
    placeholder: generateThumbnail(url, 50),
    thumbnail: generateThumbnail(url, IMAGE_SIZES.THUMBNAIL),
    medium: optimizeImageUrl(url, {
      width: IMAGE_SIZES.MEDIUM,
      quality: IMAGE_QUALITY.MEDIUM,
    }),
    full: optimizeImageUrl(url, {
      width: IMAGE_SIZES.LARGE,
      quality: IMAGE_QUALITY.HIGH,
    }),
  };
};

/**
 * Clear image cache
 */
export const clearImageCache = async (): Promise<void> => {
  try {
    logger.info('Clearing image cache');

    // Clear React Native image cache
    await Image.clearDiskCache();
    await Image.clearMemoryCache();

    // Clear custom cache
    // Note: CacheService doesn't have a pattern-based clear yet
    // This would need to be implemented in CacheService

    logger.info('Image cache cleared');
  } catch (error) {
    logger.error('Failed to clear image cache', error as Error);
  }
};

/**
 * Check if image is cached
 */
export const isImageCached = async (url: string): Promise<boolean> => {
  try {
    const optimizedUrl = optimizeImageUrl(url);
    return await cacheService.has(`image:${optimizedUrl}`);
  } catch {
    return false;
  }
};

/**
 * Batch image optimization for job photos
 */
export const optimizeJobPhotos = (
  photos: string[],
  options: ImageOptimizationOptions = {}
): Array<{ original: string; optimized: string; thumbnail: string }> => {
  return photos.map(photo => ({
    original: photo,
    optimized: optimizeImageUrl(photo, {
      width: IMAGE_SIZES.LARGE,
      quality: IMAGE_QUALITY.HIGH,
      ...options,
    }),
    thumbnail: generateThumbnail(photo),
  }));
};

/**
 * Lazy load images in viewport
 */
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private loadedImages: Set<string> = new Set();

  initialize() {
    // IntersectionObserver not available in React Native
    // This would be implemented for web version
    logger.warn('LazyImageLoader not implemented for React Native');
  }

  observe(imageUrl: string) {
    this.loadedImages.add(imageUrl);
  }

  unobserve(imageUrl: string) {
    this.loadedImages.delete(imageUrl);
  }

  disconnect() {
    this.observer?.disconnect();
    this.loadedImages.clear();
  }
}

/**
 * Image performance monitoring
 */
export const trackImageLoad = (url: string, duration: number) => {
  performanceMonitor.recordMetric('image_load_time', duration, 'custom', {
    url: url.substring(0, 100), // Limit URL length
  });

  if (duration > 3000) {
    logger.warn('Slow image load detected', { url, duration });
  }
};

/**
 * Get cache statistics for images
 */
export const getImageCacheStats = () => {
  const stats = cacheService.getStats();

  return {
    ...stats,
    cacheSize: stats.totalSize,
    hitRate: stats.hitRate,
  };
};

/**
 * Export utility functions
 */
export const imageOptimization = {
  optimize: optimizeImageUrl,
  prefetch: prefetchImage,
  prefetchBatch: prefetchImages,
  getMetadata: getImageMetadata,
  generateThumbnail,
  generateProgressive: generateProgressiveSources,
  generateResponsive: generateResponsiveSources,
  optimizeJobPhotos,
  clearCache: clearImageCache,
  isImageCached,
  trackLoad: trackImageLoad,
  getCacheStats: getImageCacheStats,
};

export default imageOptimization;
