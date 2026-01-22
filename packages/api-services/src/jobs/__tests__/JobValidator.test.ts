import { describe, it, expect, beforeEach } from 'vitest';
import { JobValidator } from '../JobValidator';

describe('JobValidator', () => {
  let validator: JobValidator;

  beforeEach(() => {
    validator = new JobValidator();
  });

  describe('validateCreateJobData', () => {
    it('should validate valid job data', () => {
      const data = {
        title: 'Fix Leaking Pipe',
        description: 'A pipe is leaking in the kitchen',
        category: 'plumbing',
        location: '123 Test St, London',
        budget: 500,
        photoUrls: ['https://example.com/photo.jpg']
      };

      const result = validator.validateCreateJobData(data);
      expect(result.title).toBe('Fix Leaking Pipe');
      expect(result.category).toBe('plumbing');
    });

    it('should throw error if title is missing', () => {
      const data = { description: 'Missing title' };
      expect(() => validator.validateCreateJobData(data)).toThrow('title: Required');
    });

    it('should sanitize HTML from title and description', () => {
      const data = {
        title: 'Fix <script>alert(1)</script>Pipe',
        description: '<b>Leaking</b>',
        category: 'plumbing'
      };

      const result = validator.validateCreateJobData(data);
      expect(result.title).toBe('Fix scriptalert(1)/scriptPipe');
      expect(result.description).toBe('bLeaking/b');
    });

    it('should validate budget range', () => {
      const data = {
        title: 'Valid Job',
        budget_min: 100,
        budget_max: 200
      };

      const result = validator.validateCreateJobData(data);
      expect(result.budget_min).toBe(100);
      expect(result.budget_max).toBe(200);
    });

    it('should throw error if budget_min > budget_max', () => {
      const data = {
        title: 'Invalid Job',
        budget_min: 300,
        budget_max: 200
      };

      expect(() => validator.validateCreateJobData(data)).toThrow('Minimum budget cannot exceed maximum budget');
    });

    it('should validate coordinates range', () => {
      const data = {
        title: 'Job with coords',
        latitude: 100, // Invalid > 90
      };

      expect(() => validator.validateCreateJobData(data)).toThrow('latitude: Invalid latitude');
    });
  });

  describe('validatePhotoUrls', () => {
    it('should filter out non-HTTPS or non-image URLs', () => {
      const urls = [
        'https://supabase.com/photo.jpg',
        'http://insecure.com/photo.png', // in-secure
        'https://malicious.com/not-an-image', // not image pattern
        'not-a-url'
      ];

      const result = validator.validatePhotoUrls(urls);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('https://supabase.com/photo.jpg');
    });

    it('should limit to 20 photos', () => {
      const urls = Array(25).fill('https://s3.amazonaws.com/photo.jpg');
      const result = validator.validatePhotoUrls(urls);
      expect(result).toHaveLength(20);
    });
  });

  describe('validateSearchQuery', () => {
    it('should allow safe search terms', () => {
      const term = 'plumbing repair';
      expect(validator.validateSearchQuery(term)).toBe('plumbing repair');
    });

    it('should throw error for SQL injection patterns', () => {
      const term = 'search; DROP TABLE jobs;';
      expect(() => validator.validateSearchQuery(term)).toThrow('Invalid search query');
    });
  });
});
