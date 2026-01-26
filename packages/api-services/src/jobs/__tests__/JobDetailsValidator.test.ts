import { describe, it, expect, beforeEach } from 'vitest';
import { JobDetailsValidator } from '../JobDetailsValidator';

describe('JobDetailsValidator', () => {
  let validator: JobDetailsValidator;

  beforeEach(() => {
    validator = new JobDetailsValidator();
  });

  describe('validateFullUpdate', () => {
    it('should validate valid full update data', () => {
      const data = {
        title: 'Updated Title',
        description: 'New Description',
        budgetMin: 500,
        budgetMax: 1000,
        priority: 'high',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
      };
      const result = validator.validateFullUpdate(data);
      expect(result.title).toBe('Updated Title');
      expect(result.priority).toBe('high');
    });

    it('should throw error if budgetMin > budgetMax', () => {
      const data = {
        budgetMin: 1000,
        budgetMax: 500
      };
      expect(() => validator.validateFullUpdate(data)).toThrow('Minimum budget cannot exceed maximum budget');
    });
  });

  describe('validatePartialUpdate', () => {
    it('should validate valid partial update', () => {
      const data = {
        status: 'in_progress',
        priority: 'medium'
      };
      const result = validator.validatePartialUpdate(data);
      expect(result.status).toBe('in_progress');
    });

    it('should throw error if no fields provided', () => {
      expect(() => validator.validatePartialUpdate({})).toThrow('At least one field must be provided for update');
    });
  });

  describe('validateJobId', () => {
    it('should validate valid UUID v4', () => {
      const validId = '550e8400-e29b-41d4-a716-446655440000';
      expect(validator.validateJobId(validId)).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(validator.validateJobId('not-a-uuid')).toBe(false);
    });
  });

  describe('validateImageUrls', () => {
    it('should filter valid image URLs', () => {
      const urls = [
        'https://example.com/image.jpg',
        'https://example.com/doc.pdf',
        'invalid-url'
      ];
      const result = validator.validateImageUrls(urls);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('https://example.com/image.jpg');
    });
  });
});
