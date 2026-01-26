import { Image } from 'react-native';
import {
  IMAGE_QUALITY,
  IMAGE_SIZES,
  optimizeImageUrl,
  prefetchImage,
  prefetchImages,
  getImageSize,
  getImageMetadata,
  generateResponsiveSources,
  generateThumbnail,
  generateProgressiveSources,
  clearImageCache,
  isImageCached,
  optimizeJobPhotos,
  LazyImageLoader,
  trackImageLoad,
  getImageCacheStats,
  imageOptimization,
} from '../../utils/imageOptimization';
import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performance';
import { cacheService } from '../../services/CacheService';

// Mock React Native Image
jest.mock('react-native', () => ({
  Image: {
    prefetch: jest.fn(),
    getSize: jest.fn(),
    clearDiskCache: jest.fn(),
    clearMemoryCache: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock performance monitor
jest.mock('../../utils/performance', () => ({
  performanceMonitor: {
    recordMetric: jest.fn(),
  },
}));

// Mock cache service
jest.mock('../../services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    getStats: jest.fn(),
  },
}));

describe('Image Optimization Constants', () => {
  describe('IMAGE_QUALITY', () => {
    it('should have correct quality presets', () => {
      expect(IMAGE_QUALITY.THUMBNAIL).toBe(0.3);
      expect(IMAGE_QUALITY.LOW).toBe(0.5);
      expect(IMAGE_QUALITY.MEDIUM).toBe(0.7);
      expect(IMAGE_QUALITY.HIGH).toBe(0.85);
      expect(IMAGE_QUALITY.ORIGINAL).toBe(1.0);
    });
  });

  describe('IMAGE_SIZES', () => {
    it('should have correct size presets', () => {
      expect(IMAGE_SIZES.THUMBNAIL).toBe(150);
      expect(IMAGE_SIZES.SMALL).toBe(320);
      expect(IMAGE_SIZES.MEDIUM).toBe(640);
      expect(IMAGE_SIZES.LARGE).toBe(1024);
      expect(IMAGE_SIZES.XLARGE).toBe(1920);
    });
  });
});

describe('optimizeImageUrl', () => {
  it('should return original URL for non-Supabase URLs', () => {
    const url = 'https://example.com/image.jpg';
    const result = optimizeImageUrl(url);

    expect(result).toBe(url);
  });

  it('should optimize Supabase URLs with default options', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = optimizeImageUrl(url);

    expect(result).toContain('quality=70');
    expect(result).toContain('progressive=true');
  });

  it('should apply width parameter', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = optimizeImageUrl(url, { width: 800 });

    expect(result).toContain('width=800');
  });

  it('should apply height parameter', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = optimizeImageUrl(url, { height: 600 });

    expect(result).toContain('height=600');
  });

  it('should apply quality parameter', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = optimizeImageUrl(url, { quality: 0.5 });

    expect(result).toContain('quality=50');
  });

  it('should apply format parameter', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = optimizeImageUrl(url, { format: 'webp' });

    expect(result).toContain('format=webp');
  });

  it('should handle existing query parameters', () => {
    const url = 'https://storage.supabase.co/image.jpg?token=abc';
    const result = optimizeImageUrl(url, { width: 500 });

    expect(result).toContain('?token=abc&');
    expect(result).toContain('width=500');
  });

  it('should skip quality parameter when quality is 1.0', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = optimizeImageUrl(url, { quality: 1.0 });

    expect(result).not.toContain('quality=');
  });

  it('should disable progressive when specified', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = optimizeImageUrl(url, { progressive: false });

    expect(result).not.toContain('progressive');
  });
});

describe('prefetchImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prefetch and cache image', async () => {
    const url = 'https://storage.supabase.co/image.jpg';
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    await prefetchImage(url);

    expect(Image.prefetch).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.stringContaining('image:'),
      expect.any(String),
      expect.any(Number)
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Image prefetched',
      expect.objectContaining({ url: expect.any(String) })
    );
  });

  it('should skip prefetch if already cached', async () => {
    const url = 'https://storage.supabase.co/image.jpg';
    (cacheService.get as jest.Mock).mockResolvedValue(url);

    await prefetchImage(url);

    expect(Image.prefetch).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Image already cached',
      expect.objectContaining({ url: expect.any(String) })
    );
  });

  it('should skip caching when cache option is false', async () => {
    const url = 'https://storage.supabase.co/image.jpg';
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    await prefetchImage(url, { cache: false });

    expect(Image.prefetch).toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('should handle prefetch errors', async () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const error = new Error('Prefetch failed');
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (Image.prefetch as jest.Mock).mockRejectedValue(error);

    await prefetchImage(url);

    expect(logger.error).toHaveBeenCalledWith('Image prefetch failed', error);
  });

  it('should record performance metrics', async () => {
    const url = 'https://storage.supabase.co/image.jpg';
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    await prefetchImage(url);

    expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
      'image_prefetch',
      expect.any(Number),
      'custom'
    );
  });
});

describe('prefetchImages', () => {
  it('should prefetch multiple images', async () => {
    const urls = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    await prefetchImages(urls);

    expect(logger.info).toHaveBeenCalledWith(
      'Prefetching images',
      { count: 3 }
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Images prefetched',
      expect.objectContaining({ count: 3 })
    );
  });

  it('should handle partial failures', async () => {
    const urls = ['image1.jpg', 'image2.jpg'];
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (Image.prefetch as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('Failed'));

    await prefetchImages(urls);

    expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
      'images_prefetch_batch',
      expect.any(Number),
      'custom'
    );
  });
});

describe('getImageSize', () => {
  it('should return image dimensions', async () => {
    const url = 'image.jpg';
    (Image.getSize as jest.Mock).mockImplementation((url, success) => {
      success(800, 600);
    });

    const result = await getImageSize(url);

    expect(result).toEqual({ width: 800, height: 600 });
  });

  it('should handle getSize errors', async () => {
    const url = 'image.jpg';
    const error = new Error('Size error');
    (Image.getSize as jest.Mock).mockImplementation((url, success, failure) => {
      failure(error);
    });

    await expect(getImageSize(url)).rejects.toEqual(error);
  });
});

describe('getImageMetadata', () => {
  it('should return image metadata', async () => {
    const url = 'image.jpg';
    (Image.getSize as jest.Mock).mockImplementation((url, success) => {
      success(800, 600);
    });
    (cacheService.has as jest.Mock).mockResolvedValue(true);

    const result = await getImageMetadata(url);

    expect(result).toMatchObject({
      url,
      width: 800,
      height: 600,
      size: expect.any(Number),
      format: 'jpg',
      cached: true,
    });
  });

  it('should handle unknown format', async () => {
    const url = 'image-without-extension';
    (Image.getSize as jest.Mock).mockImplementation((url, success) => {
      success(800, 600);
    });
    (cacheService.has as jest.Mock).mockResolvedValue(false);

    const result = await getImageMetadata(url);

    // When there's no extension (no dot), split('.').pop() returns the full string
    expect(result.format).toBe('image-without-extension');
  });

  it('should handle metadata errors', async () => {
    const url = 'image.jpg';
    const error = new Error('Metadata error');
    (Image.getSize as jest.Mock).mockImplementation((url, success, failure) => {
      failure(error);
    });

    await expect(getImageMetadata(url)).rejects.toEqual(error);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to get image metadata',
      error
    );
  });
});

describe('generateResponsiveSources', () => {
  it('should generate responsive sources with default sizes', () => {
    // Use Supabase URL so optimizations are applied
    const url = 'https://storage.supabase.co/image.jpg';
    const result = generateResponsiveSources(url);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      url: expect.stringContaining('width=320'),
      width: 320,
    });
    expect(result[1]).toEqual({
      url: expect.stringContaining('width=640'),
      width: 640,
    });
    expect(result[2]).toEqual({
      url: expect.stringContaining('width=1024'),
      width: 1024,
    });
  });

  it('should generate responsive sources with custom sizes', () => {
    const url = 'image.jpg';
    const sizes = [100, 200, 300];
    const result = generateResponsiveSources(url, sizes);

    expect(result).toHaveLength(3);
    expect(result[0].width).toBe(100);
    expect(result[1].width).toBe(200);
    expect(result[2].width).toBe(300);
  });
});

describe('generateThumbnail', () => {
  it('should generate thumbnail with default size', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = generateThumbnail(url);

    expect(result).toContain('width=150');
    expect(result).toContain('height=150');
    expect(result).toContain('quality=30');
    expect(result).toContain('format=jpeg');
  });

  it('should generate thumbnail with custom size', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = generateThumbnail(url, 200);

    expect(result).toContain('width=200');
    expect(result).toContain('height=200');
  });
});

describe('generateProgressiveSources', () => {
  it('should generate all progressive source variants', () => {
    const url = 'https://storage.supabase.co/image.jpg';
    const result = generateProgressiveSources(url);

    expect(result).toHaveProperty('placeholder');
    expect(result).toHaveProperty('thumbnail');
    expect(result).toHaveProperty('medium');
    expect(result).toHaveProperty('full');

    expect(result.placeholder).toContain('width=50');
    expect(result.thumbnail).toContain('width=150');
    expect(result.medium).toContain('width=640');
    expect(result.full).toContain('width=1024');
  });
});

describe('clearImageCache', () => {
  it('should clear React Native image caches', async () => {
    await clearImageCache();

    expect(Image.clearDiskCache).toHaveBeenCalled();
    expect(Image.clearMemoryCache).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Image cache cleared');
  });

  it('should handle clear cache errors', async () => {
    const error = new Error('Clear failed');
    (Image.clearDiskCache as jest.Mock).mockRejectedValue(error);

    await clearImageCache();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to clear image cache',
      error
    );
  });
});

describe('isImageCached', () => {
  it('should return true for cached image', async () => {
    const url = 'image.jpg';
    (cacheService.has as jest.Mock).mockResolvedValue(true);

    const result = await isImageCached(url);

    expect(result).toBe(true);
    expect(cacheService.has).toHaveBeenCalledWith(
      expect.stringContaining('image:')
    );
  });

  it('should return false for uncached image', async () => {
    const url = 'image.jpg';
    (cacheService.has as jest.Mock).mockResolvedValue(false);

    const result = await isImageCached(url);

    expect(result).toBe(false);
  });

  it('should return false on error', async () => {
    const url = 'image.jpg';
    (cacheService.has as jest.Mock).mockRejectedValue(new Error('Error'));

    const result = await isImageCached(url);

    expect(result).toBe(false);
  });
});

describe('optimizeJobPhotos', () => {
  it('should optimize multiple job photos', () => {
    const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
    const result = optimizeJobPhotos(photos);

    expect(result).toHaveLength(3);
    result.forEach((photo, index) => {
      expect(photo.original).toBe(photos[index]);
      expect(photo.optimized).toBeDefined();
      expect(photo.thumbnail).toBeDefined();
    });
  });

  it('should apply custom options', () => {
    const photos = ['https://storage.supabase.co/photo.jpg'];
    const result = optimizeJobPhotos(photos, { width: 2000 });

    expect(result[0].optimized).toContain('width=2000');
  });
});

describe('LazyImageLoader', () => {
  let loader: LazyImageLoader;

  beforeEach(() => {
    jest.clearAllMocks();
    loader = new LazyImageLoader();
  });

  it('should initialize with warning for React Native', () => {
    loader.initialize();

    expect(logger.warn).toHaveBeenCalledWith(
      'LazyImageLoader not implemented for React Native'
    );
  });

  it('should observe image URL', () => {
    const url = 'image.jpg';
    loader.observe(url);

    expect((loader as any).loadedImages.has(url)).toBe(true);
  });

  it('should unobserve image URL', () => {
    const url = 'image.jpg';
    loader.observe(url);
    loader.unobserve(url);

    expect((loader as any).loadedImages.has(url)).toBe(false);
  });

  it('should disconnect and clear loaded images', () => {
    loader.observe('image1.jpg');
    loader.observe('image2.jpg');
    loader.disconnect();

    expect((loader as any).loadedImages.size).toBe(0);
  });
});

describe('trackImageLoad', () => {
  it('should record performance metric', () => {
    const url = 'image.jpg';
    const duration = 500;

    trackImageLoad(url, duration);

    expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
      'image_load_time',
      duration,
      'custom',
      expect.objectContaining({ url })
    );
  });

  it('should warn for slow image loads', () => {
    const url = 'slow-image.jpg';
    const duration = 3500;

    trackImageLoad(url, duration);

    expect(logger.warn).toHaveBeenCalledWith(
      'Slow image load detected',
      { url, duration }
    );
  });

  it('should truncate long URLs', () => {
    const longUrl = 'a'.repeat(200);
    const duration = 500;

    trackImageLoad(longUrl, duration);

    expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
      'image_load_time',
      duration,
      'custom',
      expect.objectContaining({ url: longUrl.substring(0, 100) })
    );
  });
});

describe('getImageCacheStats', () => {
  it('should return cache statistics', () => {
    const mockStats = {
      totalSize: 1024000,
      hitRate: 0.85,
      hitCount: 100,
      missCount: 20,
    };
    (cacheService.getStats as jest.Mock).mockReturnValue(mockStats);

    const result = getImageCacheStats();

    expect(result).toMatchObject({
      cacheSize: 1024000,
      hitRate: 0.85,
    });
  });
});

describe('imageOptimization export', () => {
  it('should export all utility functions', () => {
    expect(imageOptimization.optimize).toBe(optimizeImageUrl);
    expect(imageOptimization.prefetch).toBe(prefetchImage);
    expect(imageOptimization.prefetchBatch).toBe(prefetchImages);
    expect(imageOptimization.getMetadata).toBe(getImageMetadata);
    expect(imageOptimization.generateThumbnail).toBe(generateThumbnail);
    expect(imageOptimization.generateProgressive).toBe(generateProgressiveSources);
    expect(imageOptimization.generateResponsive).toBe(generateResponsiveSources);
    expect(imageOptimization.optimizeJobPhotos).toBe(optimizeJobPhotos);
    expect(imageOptimization.clearCache).toBe(clearImageCache);
    expect(imageOptimization.isImageCached).toBe(isImageCached);
    expect(imageOptimization.trackLoad).toBe(trackImageLoad);
    expect(imageOptimization.getCacheStats).toBe(getImageCacheStats);
  });

  it('should be the default export', () => {
    const defaultExport = require('../../utils/imageOptimization').default;
    expect(defaultExport).toBe(imageOptimization);
  });
});