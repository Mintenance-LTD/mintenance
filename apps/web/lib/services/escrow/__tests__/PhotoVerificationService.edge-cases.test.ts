/**
 * Edge Case Unit Tests for PhotoVerificationService
 * 
 * Tests error handling, boundary conditions, and validation edge cases
 */

import { PhotoVerificationService } from '../PhotoVerificationService';
import type { Photo } from '../PhotoVerificationService';

describe('PhotoVerificationService - Edge Cases', () => {
  describe('validatePhotos - Error Handling', () => {
    it('should handle empty photos array', async () => {
      const result = await PhotoVerificationService.validatePhotos([], 'plumbing', {
        lat: 51.5074,
        lng: -0.1278,
      });

      expect(result.passed).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringMatching(/minimum.*photos/i)
      );
    });

    it('should handle null photos array', async () => {
      await expect(
        PhotoVerificationService.validatePhotos(
          null as unknown as Photo[],
          'plumbing',
          { lat: 51.5074, lng: -0.1278 }
        )
      ).rejects.toThrow();
    });

    it('should handle undefined photos array', async () => {
      await expect(
        PhotoVerificationService.validatePhotos(
          undefined as unknown as Photo[],
          'plumbing',
          { lat: 51.5074, lng: -0.1278 }
        )
      ).rejects.toThrow();
    });

    it('should handle invalid job location', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg' },
        { url: 'https://example.com/photo2.jpg' },
        { url: 'https://example.com/photo3.jpg' },
      ];

      await expect(
        PhotoVerificationService.validatePhotos(
          photos,
          'plumbing',
          null as unknown as { lat: number; lng: number }
        )
      ).rejects.toThrow();
    });

    it('should handle invalid category', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg' },
      ];

      const result = await PhotoVerificationService.validatePhotos(
        photos,
        'invalid-category' as any,
        { lat: 51.5074, lng: -0.1278 }
      );

      // Should fall back to general category requirements
      expect(result).toBeDefined();
    });
  });

  describe('checkPhotoQuality - Boundary Conditions', () => {
    it('should handle photo with zero brightness', async () => {
      // Mock image analysis to return zero brightness
      const result = await PhotoVerificationService.checkPhotoQuality(
        'https://example.com/dark-photo.jpg'
      );

      expect(result.passed).toBe(false);
      expect(result.brightness).toBeLessThan(0.3);
      expect(result.issues).toContainEqual(
        expect.stringMatching(/brightness/i)
      );
    });

    it('should handle photo with maximum brightness', async () => {
      const result = await PhotoVerificationService.checkPhotoQuality(
        'https://example.com/bright-photo.jpg'
      );

      // Should handle overexposed photos
      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should handle photo with zero sharpness', async () => {
      const result = await PhotoVerificationService.checkPhotoQuality(
        'https://example.com/blurry-photo.jpg'
      );

      expect(result.passed).toBe(false);
      expect(result.sharpness).toBeLessThan(0.5);
      expect(result.issues).toContainEqual(
        expect.stringMatching(/sharpness|blur/i)
      );
    });

    it('should handle photo below minimum resolution', async () => {
      const result = await PhotoVerificationService.checkPhotoQuality(
        'https://example.com/low-res-photo.jpg'
      );

      // Should detect low resolution
      expect(result).toBeDefined();
      if (result.resolution.width < 800 || result.resolution.height < 600) {
        expect(result.issues).toContainEqual(
          expect.stringMatching(/resolution/i)
        );
      }
    });

    it('should handle photo exceeding maximum file size', async () => {
      // This would typically be checked before calling the service
      // But we test the service handles it if it gets through
      const result = await PhotoVerificationService.checkPhotoQuality(
        'https://example.com/large-photo.jpg'
      );

      expect(result).toBeDefined();
    });
  });

  describe('compareBeforeAfter - Edge Cases', () => {
    it('should handle empty before photos', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter(
        [],
        [{ url: 'https://example.com/after1.jpg' }]
      );

      expect(result.comparisonScore).toBe(0);
      expect(result.matches).toBe(false);
    });

    it('should handle empty after photos', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter(
        [{ url: 'https://example.com/before1.jpg' }],
        []
      );

      expect(result.comparisonScore).toBe(0);
      expect(result.matches).toBe(false);
    });

    it('should handle both arrays empty', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter([], []);

      expect(result.comparisonScore).toBe(0);
      expect(result.matches).toBe(false);
    });

    it('should handle mismatched photo counts', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter(
        [{ url: 'https://example.com/before1.jpg' }],
        [
          { url: 'https://example.com/after1.jpg' },
          { url: 'https://example.com/after2.jpg' },
        ]
      );

      expect(result).toBeDefined();
      expect(result.differences.length).toBeGreaterThan(0);
    });
  });

  describe('verifyGeolocation - Boundary Conditions', () => {
    it('should handle photo exactly at maximum distance threshold', async () => {
      const jobLocation = { lat: 51.5074, lng: -0.1278 };
      // Photo at exactly 100 meters away
      const photoLocation = {
        lat: 51.5074 + 100 / 111320, // ~100m north
        lng: -0.1278,
        accuracy: 10,
      };

      const result = await PhotoVerificationService.verifyGeolocation(
        photoLocation,
        jobLocation
      );

      expect(result.withinThreshold).toBe(true);
      expect(result.distance).toBeCloseTo(100, 0);
    });

    it('should handle photo just beyond maximum distance threshold', async () => {
      const jobLocation = { lat: 51.5074, lng: -0.1278 };
      // Photo at 101 meters away
      const photoLocation = {
        lat: 51.5074 + 101 / 111320,
        lng: -0.1278,
        accuracy: 10,
      };

      const result = await PhotoVerificationService.verifyGeolocation(
        photoLocation,
        jobLocation
      );

      expect(result.withinThreshold).toBe(false);
      expect(result.distance).toBeGreaterThan(100);
    });

    it('should handle photo with very high GPS accuracy', async () => {
      const jobLocation = { lat: 51.5074, lng: -0.1278 };
      const photoLocation = {
        lat: 51.5074,
        lng: -0.1278,
        accuracy: 100, // Very inaccurate
      };

      const result = await PhotoVerificationService.verifyGeolocation(
        photoLocation,
        jobLocation
      );

      expect(result.verified).toBe(false);
      expect(result.accuracy).toBeGreaterThan(50);
    });

    it('should handle photo with missing geolocation', async () => {
      const jobLocation = { lat: 51.5074, lng: -0.1278 };
      const photoLocation = undefined;

      const result = await PhotoVerificationService.verifyGeolocation(
        photoLocation as any,
        jobLocation
      );

      expect(result.verified).toBe(false);
    });
  });

  describe('verifyTimestamp - Edge Cases', () => {
    it('should handle photo at maximum age threshold', async () => {
      const photoTimestamp = new Date(
        Date.now() - 24 * 60 * 60 * 1000 // Exactly 24 hours ago
      );

      const result = await PhotoVerificationService.verifyTimestamp(photoTimestamp);

      expect(result.isRecent).toBe(true);
      expect(result.verified).toBe(true);
    });

    it('should handle photo just beyond maximum age threshold', async () => {
      const photoTimestamp = new Date(
        Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      );

      const result = await PhotoVerificationService.verifyTimestamp(photoTimestamp);

      expect(result.isRecent).toBe(false);
      expect(result.verified).toBe(false);
    });

    it('should handle future timestamp', async () => {
      const photoTimestamp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future

      const result = await PhotoVerificationService.verifyTimestamp(photoTimestamp);

      expect(result.verified).toBe(false);
      expect(result.timeDifference).toBeLessThan(0);
    });

    it('should handle very old timestamp', async () => {
      const photoTimestamp = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

      const result = await PhotoVerificationService.verifyTimestamp(photoTimestamp);

      expect(result.verified).toBe(false);
      expect(result.isRecent).toBe(false);
    });

    it('should handle missing timestamp', async () => {
      const result = await PhotoVerificationService.verifyTimestamp(undefined as any);

      expect(result.verified).toBe(false);
    });
  });

  describe('validatePhotos - Category Specific Edge Cases', () => {
    it('should enforce minimum photos for plumbing category', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg' },
        { url: 'https://example.com/photo2.jpg' },
        // Only 2 photos, need 3 for plumbing
      ];

      const result = await PhotoVerificationService.validatePhotos(
        photos,
        'plumbing',
        { lat: 51.5074, lng: -0.1278 }
      );

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require specific angles for electrical category', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo2.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo3.jpg', angleType: 'wide' },
        // Missing close-up angle
      ];

      const result = await PhotoVerificationService.validatePhotos(
        photos,
        'electrical',
        { lat: 51.5074, lng: -0.1278 }
      );

      // Should flag missing required angles
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

