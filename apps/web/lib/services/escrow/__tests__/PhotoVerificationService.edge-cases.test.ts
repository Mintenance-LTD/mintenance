/**
 * Edge Case Unit Tests for PhotoVerificationService
 * 
 * Tests error handling, boundary conditions, and validation edge cases
 */

// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { PhotoVerificationService } from '../PhotoVerificationService';
import type { Photo } from '../PhotoVerificationService';

// Mock the serverSupabase
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// Mock the URL validation
vi.mock('@/lib/security/url-validation', () => ({
  validateURL: vi.fn().mockResolvedValue({ isValid: true, normalizedUrl: 'https://example.com/photo.jpg' }),
  validateURLs: vi.fn().mockResolvedValue({ valid: [], invalid: [] }),
}));

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  headers: {
    get: (name: string) => {
      if (name === 'content-type') return 'image/jpeg';
      if (name === 'content-length') return '1024';
      return null;
    },
  },
}) as unknown as typeof fetch;

describe('PhotoVerificationService - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validatePhotoRequirements - Error Handling', () => {
    it('should handle empty photos array', async () => {
      const result = await PhotoVerificationService.validatePhotoRequirements('plumbing', []);

      expect(result.passed).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringMatching(/minimum.*photos/i)
      );
    });

    it('should handle invalid category with fallback to general', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg' },
      ];

      const result = await PhotoVerificationService.validatePhotoRequirements(
        'invalid-category',
        photos
      );

      // Should fall back to general category requirements
      expect(result).toBeDefined();
      expect(result.requirements.minPhotos).toBe(3); // General requires 3
    });

    it('should detect missing required angles', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo2.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo3.jpg', angleType: 'wide' },
      ];

      const result = await PhotoVerificationService.validatePhotoRequirements(
        'plumbing',
        photos
      );

      // Plumbing requires 'close-up' and 'wide' angles
      expect(result.errors).toContainEqual(
        expect.stringMatching(/missing.*angles.*close-up/i)
      );
    });

    it('should pass when all requirements are met', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide', qualityScore: 0.9 },
        { url: 'https://example.com/photo2.jpg', angleType: 'close-up', qualityScore: 0.85 },
        { url: 'https://example.com/photo3.jpg', angleType: 'wide', qualityScore: 0.8 },
      ];

      const result = await PhotoVerificationService.validatePhotoRequirements(
        'plumbing',
        photos
      );

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should add warnings for low quality photos', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide', qualityScore: 0.4 },
        { url: 'https://example.com/photo2.jpg', angleType: 'close-up', qualityScore: 0.9 },
        { url: 'https://example.com/photo3.jpg', angleType: 'wide', qualityScore: 0.8 },
      ];

      const result = await PhotoVerificationService.validatePhotoRequirements(
        'plumbing',
        photos
      );

      expect(result.warnings).toContainEqual(
        expect.stringMatching(/low quality/i)
      );
    });
  });

  describe('validatePhotoQuality - Boundary Conditions', () => {
    it('should return quality result for valid URL', async () => {
      const result = await PhotoVerificationService.validatePhotoQuality(
        'https://example.com/photo.jpg'
      );

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should handle errors gracefully when image info cannot be fetched', async () => {
      // Mock fetch to fail
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const result = await PhotoVerificationService.validatePhotoQuality(
        'https://example.com/unreachable-photo.jpg'
      );

      // Service should return a result even when fetch fails (graceful degradation)
      expect(result).toBeDefined();
      expect(result.passed).toBe(false); // Returns failed when image can't be analyzed
      expect(result.issues).toContainEqual(expect.stringMatching(/failed/i));
    });
  });

  describe('compareBeforeAfter - Edge Cases', () => {
    const jobLocation = { lat: 51.5074, lng: -0.1278 };

    it('should handle empty before photos', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter(
        [],
        ['https://example.com/after1.jpg'],
        jobLocation
      );

      expect(result.comparisonScore).toBe(0);
      expect(result.matches).toBe(false);
      expect(result.differences).toContainEqual(
        expect.stringMatching(/missing/i)
      );
    });

    it('should handle empty after photos', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter(
        ['https://example.com/before1.jpg'],
        [],
        jobLocation
      );

      expect(result.comparisonScore).toBe(0);
      expect(result.matches).toBe(false);
      expect(result.differences).toContainEqual(
        expect.stringMatching(/missing/i)
      );
    });

    it('should handle both empty arrays', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter(
        [],
        [],
        jobLocation
      );

      expect(result.comparisonScore).toBe(0);
      expect(result.matches).toBe(false);
    });

    it('should handle valid comparison request', async () => {
      const result = await PhotoVerificationService.compareBeforeAfter(
        ['https://example.com/before1.jpg'],
        ['https://example.com/after1.jpg'],
        jobLocation
      );

      expect(result).toBeDefined();
      expect(typeof result.comparisonScore).toBe('number');
    });
  });

  describe('verifyGeolocation - Edge Cases', () => {
    const jobLocation = { lat: 51.5074, lng: -0.1278 };

    it('should handle missing photo geolocation', async () => {
      const result = await PhotoVerificationService.verifyGeolocation(
        'https://example.com/photo.jpg',
        jobLocation,
        undefined
      );

      expect(result.verified).toBe(false);
      expect(result.distance).toBe(Infinity);
    });

    it('should verify when photo is at job location', async () => {
      const result = await PhotoVerificationService.verifyGeolocation(
        'https://example.com/photo.jpg',
        jobLocation,
        { lat: 51.5074, lng: -0.1278, accuracy: 10 }
      );

      expect(result.verified).toBe(true);
      expect(result.distance).toBe(0);
      expect(result.withinThreshold).toBe(true);
    });

    it('should reject when photo is too far from job location', async () => {
      const result = await PhotoVerificationService.verifyGeolocation(
        'https://example.com/photo.jpg',
        jobLocation,
        { lat: 52.5200, lng: 13.4050, accuracy: 10 } // Berlin
      );

      expect(result.verified).toBe(false);
      expect(result.withinThreshold).toBe(false);
      expect(result.distance).toBeGreaterThan(100);
    });

    it('should reject when GPS accuracy is too low', async () => {
      const result = await PhotoVerificationService.verifyGeolocation(
        'https://example.com/photo.jpg',
        jobLocation,
        { lat: 51.5074, lng: -0.1278, accuracy: 100 } // 100m accuracy
      );

      expect(result.verified).toBe(false);
    });
  });

  describe('verifyTimestamp - Edge Cases', () => {
    it('should verify timestamp for valid photo URL', async () => {
      const result = await PhotoVerificationService.verifyTimestamp(
        'https://example.com/photo.jpg'
      );

      expect(result).toBeDefined();
      expect(typeof result.verified).toBe('boolean');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle time window verification', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);

      const result = await PhotoVerificationService.verifyTimestamp(
        'https://example.com/photo.jpg',
        { start: oneHourAgo, end: oneHourAhead }
      );

      expect(result).toBeDefined();
      expect(typeof result.isRecent).toBe('boolean');
    });
  });

  describe('checkMinimumAngles - Edge Cases', () => {
    it('should return false for empty photos array', () => {
      const result = PhotoVerificationService.checkMinimumAngles([]);
      expect(result).toBe(false);
    });

    it('should return false for photos with same angle', () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo2.jpg', angleType: 'wide' },
      ];

      const result = PhotoVerificationService.checkMinimumAngles(photos);
      expect(result).toBe(false);
    });

    it('should return true for photos with different angles', () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo2.jpg', angleType: 'close-up' },
      ];

      const result = PhotoVerificationService.checkMinimumAngles(photos);
      expect(result).toBe(true);
    });

    it('should ignore photos without angle type', () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg' },
        { url: 'https://example.com/photo2.jpg' },
        { url: 'https://example.com/photo3.jpg', angleType: 'wide' },
      ];

      const result = PhotoVerificationService.checkMinimumAngles(photos);
      expect(result).toBe(false); // Only 1 distinct angle
    });
  });

  describe('Category-Specific Requirements', () => {
    it('should enforce minimum photos for plumbing category', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo2.jpg', angleType: 'close-up' },
        // Only 2 photos, need 3 for plumbing
      ];

      const result = await PhotoVerificationService.validatePhotoRequirements(
        'plumbing',
        photos
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

      const result = await PhotoVerificationService.validatePhotoRequirements(
        'electrical',
        photos
      );

      // Should flag missing required angles
      expect(result.errors).toContainEqual(
        expect.stringMatching(/missing.*angles.*close-up/i)
      );
    });

    it('should use general requirements for unknown category', async () => {
      const photos: Photo[] = [
        { url: 'https://example.com/photo1.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo2.jpg', angleType: 'wide' },
        { url: 'https://example.com/photo3.jpg', angleType: 'wide' },
      ];

      const result = await PhotoVerificationService.validatePhotoRequirements(
        'unknown-category-xyz',
        photos
      );

      // Should use general requirements
      expect(result.requirements.minPhotos).toBe(3);
    });
  });
});
