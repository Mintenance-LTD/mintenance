jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

/**
 * ImageCompressionService Tests
 *
 * Comprehensive test suite for image compression functionality
 */

import ImageCompressionService, {
  compressProfilePhoto,
  compressJobPhoto,
  compressPropertyAssessmentPhoto,
  compressJobPhotos,
  type CompressionResult,
  type BatchCompressionResult,
  type ProgressCallback,
} from '../ImageCompressionService';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Mock expo modules
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
}));

// Mock logger
jest.mock('../../utils/logger-enhanced', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  logMedia: jest.fn(),
}));

describe('ImageCompressionService', () => {
  const mockImageUri = 'file:///mock/image.jpg';
  const mockCompressedUri = 'file:///mock/compressed.jpg';
  const mockThumbnailUri = 'file:///mock/thumbnail.jpg';
  const getPrimaryCompressionCall = () => {
    const calls = (ImageManipulator.manipulateAsync as jest.Mock).mock.calls;
    return calls.find((call) => {
      const options = call[2];
      return options?.compress !== 1 && options?.compress !== 0.6;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (FileSystem.getInfoAsync as jest.Mock).mockImplementation((uri: string) => {
      const size =
        uri === mockCompressedUri || uri === mockThumbnailUri ? 1000000 : 5000000;
      return Promise.resolve({
        exists: true,
        size,
        isDirectory: false,
      });
    });

    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: mockCompressedUri,
      width: 1200,
      height: 900,
    });
  });

  describe('compress()', () => {
    it('should compress image successfully', async () => {
      const result = await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
      });

      expect(result.uri).toBe(mockCompressedUri);
      expect(result.error).toBeUndefined();
      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith(mockImageUri);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalled();
    });

    it('should use correct preset for profile photos', async () => {
      await ImageCompressionService.compress(mockImageUri, {
        purpose: 'profile',
      });

      const manipulateCall = getPrimaryCompressionCall();
      const options = manipulateCall?.[2];

      expect(options.compress).toBe(0.7);
      expect(options.format).toBe(ImageManipulator.SaveFormat.JPEG);
    });

    it('should use correct preset for job photos', async () => {
      await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
      });

      const manipulateCall = getPrimaryCompressionCall();
      const options = manipulateCall?.[2];

      expect(options.compress).toBe(0.8);
    });

    it('should use correct preset for property assessments', async () => {
      await ImageCompressionService.compress(mockImageUri, {
        purpose: 'property-assessment',
      });

      const manipulateCall = getPrimaryCompressionCall();
      const options = manipulateCall?.[2];

      expect(options.compress).toBe(0.85);
    });

    it('should handle custom options overriding presets', async () => {
      await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
        quality: 0.95,
        maxWidth: 2000,
      });

      const manipulateCall = getPrimaryCompressionCall();
      const options = manipulateCall?.[2];

      expect(options.compress).toBe(0.95);
    });

    it('should resize image when larger than max dimensions', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({
          uri: mockImageUri,
          width: 3000,
          height: 2000,
        })
        .mockResolvedValueOnce({
          uri: mockCompressedUri,
          width: 1200,
          height: 800,
        });

      await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
      });

      const manipulateCall = getPrimaryCompressionCall();
      const actions = manipulateCall?.[1] || [];

      expect(actions).toContainEqual({
        resize: expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      });
    });

    it('should maintain aspect ratio when resizing', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({
          uri: mockImageUri,
          width: 2000,
          height: 1000, // 2:1 aspect ratio
        })
        .mockResolvedValueOnce({
          uri: mockCompressedUri,
          width: 1200,
          height: 600, // Should maintain 2:1 ratio
        });

      const result = await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
        maxWidth: 1200,
        maxHeight: 1200,
      });

      // Aspect ratio should be preserved
      const originalRatio = 2000 / 1000;
      const compressedRatio = result.width / result.height;
      expect(compressedRatio).toBeCloseTo(originalRatio, 1);
    });

    it('should generate thumbnail when requested', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({
          uri: mockImageUri,
          width: 1200,
          height: 900,
        })
        .mockResolvedValueOnce({
          uri: mockCompressedUri,
          width: 1200,
          height: 900,
        })
        .mockResolvedValueOnce({
          uri: mockThumbnailUri,
          width: 200,
          height: 150,
        });

      const result = await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
        generateThumbnail: true,
      });

      expect(result.thumbnailUri).toBe(mockThumbnailUri);
    });

    it('should not generate thumbnail when disabled', async () => {
      const result = await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
        generateThumbnail: false,
      });

      expect(result.thumbnailUri).toBeUndefined();
    });

    it('should calculate compression ratio correctly', async () => {
      (FileSystem.getInfoAsync as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          exists: true,
          size: 5000000, // 5MB original
          isDirectory: false,
        }))
        .mockImplementationOnce(() => Promise.resolve({
          exists: true,
          size: 1000000, // 1MB compressed
          isDirectory: false,
        }));

      const result = await ImageCompressionService.compress(mockImageUri, {
        purpose: 'job',
      });

      expect(result.originalSize).toBe(5000000);
      expect(result.compressedSize).toBe(1000000);
      expect(result.compressionRatio).toBe(0.2); // 20% of original
    });

    it('should handle file not found error', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockImplementationOnce(() => Promise.resolve({
        exists: false,
      }));

      const result = await ImageCompressionService.compress(mockImageUri);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
    });

    it('should handle compression errors gracefully', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Compression failed')
      );

      const result = await ImageCompressionService.compress(mockImageUri);

      expect(result.error).toBeDefined();
      expect(result.uri).toBe(mockImageUri); // Returns original URI on error
    });
  });

  describe('compressBatch()', () => {
    const mockUris = [
      'file:///mock/image1.jpg',
      'file:///mock/image2.jpg',
      'file:///mock/image3.jpg',
    ];

    beforeEach(() => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'compressed1.jpg', width: 1200, height: 900 })
        .mockResolvedValueOnce({ uri: 'compressed2.jpg', width: 1200, height: 900 })
        .mockResolvedValueOnce({ uri: 'compressed3.jpg', width: 1200, height: 900 });

      (FileSystem.getInfoAsync as jest.Mock).mockImplementation((uri: string) => {
        const originalSizes: Record<string, number> = {
          'image1.jpg': 5000000,
          'image2.jpg': 4000000,
          'image3.jpg': 3000000,
        };
        const compressedSizes: Record<string, number> = {
          'compressed1.jpg': 1000000,
          'compressed2.jpg': 800000,
          'compressed3.jpg': 600000,
        };

        const matchingOriginal = Object.keys(originalSizes).find((key) => uri.includes(key));
        if (matchingOriginal) {
          return Promise.resolve({
            exists: true,
            size: originalSizes[matchingOriginal],
            isDirectory: false,
          });
        }

        const matchingCompressed = Object.keys(compressedSizes).find((key) => uri.includes(key));
        if (matchingCompressed) {
          return Promise.resolve({
            exists: true,
            size: compressedSizes[matchingCompressed],
            isDirectory: false,
          });
        }

        return Promise.resolve({
          exists: true,
          size: 0,
          isDirectory: false,
        });
      });
    });

    it('should compress multiple images', async () => {
      const result = await ImageCompressionService.compressBatch(mockUris, {
        purpose: 'job',
      });

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it('should call progress callback during batch processing', async () => {
      const progressCallback = jest.fn();

      await ImageCompressionService.compressBatch(
        mockUris,
        { purpose: 'job' },
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalledTimes(4); // 0, 1, 2, 3 (final)
      expect(progressCallback).toHaveBeenCalledWith(0, 3, mockUris[0]);
      expect(progressCallback).toHaveBeenCalledWith(1, 3, mockUris[1]);
      expect(progressCallback).toHaveBeenCalledWith(2, 3, mockUris[2]);
      expect(progressCallback).toHaveBeenCalledWith(3, 3, '');
    });

    it('should continue processing on individual failures', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'compressed1.jpg', width: 1200, height: 900 })
        .mockRejectedValueOnce(new Error('Compression failed'))
        .mockResolvedValueOnce({ uri: 'compressed3.jpg', width: 1200, height: 900 });

      const result = await ImageCompressionService.compressBatch(mockUris, {
        purpose: 'job',
      });

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.results[1].error).toBeDefined();
    });

    it('should calculate total compression stats', async () => {
      const sizeQueue = [
        { exists: true, size: 5000000, isDirectory: false }, // original 1
        { exists: true, size: 1000000, isDirectory: false }, // compressed 1
        { exists: true, size: 4000000, isDirectory: false }, // original 2
        { exists: true, size: 800000, isDirectory: false }, // compressed 2
        { exists: true, size: 3000000, isDirectory: false }, // original 3
        { exists: true, size: 600000, isDirectory: false }, // compressed 3
      ];

      (FileSystem.getInfoAsync as jest.Mock).mockImplementation(() => Promise.resolve(
        sizeQueue.shift() || { exists: true, size: 0, isDirectory: false }
      ));

      const result = await ImageCompressionService.compressBatch(mockUris, {
        purpose: 'job',
      });

      expect(result.totalOriginalSize).toBe(12000000); // 5MB + 4MB + 3MB
      expect(result.totalCompressedSize).toBe(2400000); // 1MB + 0.8MB + 0.6MB
      expect(result.totalCompressionRatio).toBeCloseTo(0.2, 1); // ~20%
    });

    it('should measure batch processing duration', async () => {
      let now = 0;
      const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
        now += 10;
        return now;
      });

      const result = await ImageCompressionService.compressBatch(mockUris, {
        purpose: 'job',
      });

      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.duration).toBe('number');

      nowSpy.mockRestore();
    });
  });

  describe('generateThumbnail()', () => {
    it('should generate thumbnail with default size', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: mockThumbnailUri,
        width: 200,
        height: 200,
      });

      const thumbnailUri = await ImageCompressionService.generateThumbnail(mockImageUri);

      expect(thumbnailUri).toBe(mockThumbnailUri);
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockImageUri,
        [{ resize: { width: 200, height: 200 } }],
        expect.objectContaining({
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
        })
      );
    });

    it('should generate thumbnail with custom size', async () => {
      await ImageCompressionService.generateThumbnail(mockImageUri, 300);

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        mockImageUri,
        [{ resize: { width: 300, height: 300 } }],
        expect.any(Object)
      );
    });
  });

  describe('generateMultipleThumbnails()', () => {
    it('should generate multiple thumbnail sizes', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'thumb100.jpg', width: 100, height: 100 })
        .mockResolvedValueOnce({ uri: 'thumb200.jpg', width: 200, height: 200 })
        .mockResolvedValueOnce({ uri: 'thumb400.jpg', width: 400, height: 400 });

      const thumbnails = await ImageCompressionService.generateMultipleThumbnails(
        mockImageUri,
        [100, 200, 400]
      );

      expect(thumbnails).toHaveLength(3);
      expect(thumbnails[0]).toEqual({ size: 100, uri: 'thumb100.jpg' });
      expect(thumbnails[1]).toEqual({ size: 200, uri: 'thumb200.jpg' });
      expect(thumbnails[2]).toEqual({ size: 400, uri: 'thumb400.jpg' });
    });
  });

  describe('needsCompression()', () => {
    it('should return true for large files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 10000000, // 10MB
        isDirectory: false,
      });

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: mockImageUri,
        width: 1200,
        height: 900,
      });

      const needsCompression = await ImageCompressionService.needsCompression(
        mockImageUri,
        'job',
        2 // 2MB threshold
      );

      expect(needsCompression).toBe(true);
    });

    it('should return true for oversized dimensions', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1000000, // 1MB (under threshold)
        isDirectory: false,
      });

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: mockImageUri,
        width: 3000, // Larger than job preset (1200)
        height: 2000,
      });

      const needsCompression = await ImageCompressionService.needsCompression(
        mockImageUri,
        'job',
        2
      );

      expect(needsCompression).toBe(true);
    });

    it('should return false for already optimized images', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 500000, // 0.5MB
        isDirectory: false,
      });

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: mockImageUri,
        width: 800,
        height: 600,
      });

      const needsCompression = await ImageCompressionService.needsCompression(
        mockImageUri,
        'job',
        2
      );

      expect(needsCompression).toBe(false);
    });
  });

  describe('estimateCompressedSize()', () => {
    it('should estimate compressed size', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 5000000, // 5MB
        isDirectory: false,
      });

      const estimatedSize = await ImageCompressionService.estimateCompressedSize(
        mockImageUri,
        'job' // 0.8 quality → ~24% estimated ratio
      );

      expect(estimatedSize).toBeGreaterThan(0);
      expect(estimatedSize).toBeLessThan(5000000);
    });

    it('should return 0 for non-existent files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      const estimatedSize = await ImageCompressionService.estimateCompressedSize(
        mockImageUri
      );

      expect(estimatedSize).toBe(0);
    });
  });

  describe('getCompressionStats()', () => {
    it('should calculate compression statistics', async () => {
      const result: CompressionResult = {
        uri: mockCompressedUri,
        width: 1200,
        height: 900,
        originalSize: 5000000, // 5MB
        compressedSize: 1000000, // 1MB
        compressionRatio: 0.2,
      };

      const stats = ImageCompressionService.getCompressionStats(result);

      expect(stats.savedBytes).toBe(4000000);
      expect(stats.savedMB).toBeCloseTo(3.81, 1);
      expect(stats.savedPercentage).toBeCloseTo(80, 0);
    });

    it('should handle zero original size', async () => {
      const result: CompressionResult = {
        uri: mockCompressedUri,
        width: 1200,
        height: 900,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1,
      };

      const stats = ImageCompressionService.getCompressionStats(result);

      expect(stats.savedBytes).toBe(0);
      expect(stats.savedPercentage).toBe(0);
    });
  });

  describe('Convenience functions', () => {
    it('compressProfilePhoto should use profile preset', async () => {
      await compressProfilePhoto(mockImageUri);

      const manipulateCall = getPrimaryCompressionCall();
      const options = manipulateCall?.[2];

      expect(options.compress).toBe(0.7); // Profile quality
    });

    it('compressJobPhoto should use job preset', async () => {
      await compressJobPhoto(mockImageUri);

      const manipulateCall = getPrimaryCompressionCall();
      const options = manipulateCall?.[2];

      expect(options.compress).toBe(0.8); // Job quality
    });

    it('compressPropertyAssessmentPhoto should use property-assessment preset', async () => {
      await compressPropertyAssessmentPhoto(mockImageUri);

      const manipulateCall = getPrimaryCompressionCall();
      const options = manipulateCall?.[2];

      expect(options.compress).toBe(0.85); // Property assessment quality
    });

    it('compressJobPhotos should batch compress with job preset', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'compressed1.jpg', width: 1200, height: 900 })
        .mockResolvedValueOnce({ uri: 'compressed2.jpg', width: 1200, height: 900 });

      const result = await compressJobPhotos(
        ['image1.jpg', 'image2.jpg']
      );

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
    });
  });
});
