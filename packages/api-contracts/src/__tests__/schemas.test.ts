import { z } from 'zod';
import { createJobRequestSchema, JOB_CATEGORIES } from '../jobs';
import { loginRequestSchema, registerRequestSchema } from '../auth';

describe('api-contracts schemas', () => {
  describe('jobs', () => {
    it('should export JOB_CATEGORIES', () => {
      expect(JOB_CATEGORIES).toContain('plumbing');
      expect(JOB_CATEGORIES).toContain('electrical');
      expect(JOB_CATEGORIES.length).toBeGreaterThan(10);
    });

    it('should validate a valid job creation request', () => {
      const validJob = {
        title: 'Fix leaking pipe',
        description: 'A'.repeat(50), // min 50 chars
        category: 'plumbing',
        urgency: 'medium' as const,
        budget: 500,
      };
      const result = createJobRequestSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it('should reject job with empty title', () => {
      const invalidJob = {
        title: '',
        description: 'A'.repeat(50),
        category: 'plumbing',
      };
      const result = createJobRequestSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });

    it('should reject job with short description', () => {
      const invalidJob = {
        title: 'Fix pipe',
        description: 'Too short',
        category: 'plumbing',
      };
      const result = createJobRequestSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });

    it('should reject negative budget', () => {
      const invalidJob = {
        title: 'Fix pipe',
        description: 'A'.repeat(50),
        category: 'plumbing',
        budget: -100,
      };
      const result = createJobRequestSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });
  });

  describe('auth', () => {
    it('should validate a login request', () => {
      const result = loginRequestSchema.safeParse({
        email: 'user@example.com',
        password: 'StrongP@ss1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject login with invalid email', () => {
      const result = loginRequestSchema.safeParse({
        email: 'not-an-email',
        password: 'StrongP@ss1',
      });
      expect(result.success).toBe(false);
    });

    it('should validate a signup request', () => {
      const result = registerRequestSchema.safeParse({
        email: 'new@example.com',
        password: 'StrongP@ss1',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
      });
      expect(result.success).toBe(true);
    });
  });
});
