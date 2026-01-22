/**
 * Job Validator - Input Validation Layer
 * Handles all validation and sanitization for job operations
 */
import { z } from 'zod';
// TODO: Fix import path for @mintenance/security
// import { sanitize } from '@mintenance/security';
// Temporary sanitize object until @mintenance/security is available
const sanitize = {
  text: (input: string, maxLength?: number) => {
    if (!input) return '';
    const cleaned = input.trim().replace(/[<>]/g, '');
    return maxLength ? cleaned.substring(0, maxLength) : cleaned;
  },
  jobDescription: (input: string) => sanitize.text(input, 5000),
  address: (input: string) => sanitize.text(input, 256),
  searchQuery: (input: string) => sanitize.text(input, 100),
  isValidSearchTerm: (input: string) => {
    // Basic SQL injection check
    const dangerous = /(\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|UNION)\b)/i;
    return !dangerous.test(input);
  }
};
// Schema for listing jobs
export const listJobsSchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.array(z.string()).optional(),
});
// Base object for creating a job (required for .partial() support)
export const baseCreateJobSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title too long')
    .transform(val => sanitize.text(val, 200)),
  description: z
    .string()
    .max(5000, 'Description too long')
    .optional()
    .transform(val => val ? sanitize.jobDescription(val) : undefined),
  status: z
    .enum(['draft', 'posted', 'in_progress', 'completed', 'cancelled'])
    .optional()
    .default('posted'),
  category: z
    .string()
    .max(128)
    .optional()
    .transform(val => val ? sanitize.text(val, 128) : undefined),
  budget: z.coerce
    .number()
    .positive('Budget must be positive')
    .max(1000000, 'Budget too high')
    .optional(),
  budget_min: z.coerce
    .number()
    .positive('Minimum budget must be positive')
    .max(1000000)
    .optional(),
  budget_max: z.coerce
    .number()
    .positive('Maximum budget must be positive')
    .max(1000000)
    .optional(),
  show_budget_to_contractors: z.boolean().optional().default(true),
  require_itemized_bids: z.boolean().optional().default(false),
  location: z
    .string()
    .max(256)
    .optional()
    .transform(val => val ? sanitize.address(val) : undefined),
  photoUrls: z
    .array(z.string().url('Invalid photo URL'))
    .max(20, 'Too many photos')
    .optional(),
  requiredSkills: z
    .array(
      z.string()
        .max(100)
        .transform(val => sanitize.text(val, 100))
    )
    .max(10, 'Too many required skills')
    .optional(),
  property_id: z.string().uuid('Invalid property ID').optional(),
  latitude: z.coerce
    .number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude')
    .optional(),
  longitude: z.coerce
    .number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude')
    .optional(),
});

// Schema for creating a job with cross-field validation
export const createJobSchema = baseCreateJobSchema
  .refine(
    (data) => {
      // Ensure budget range is valid
      if (data.budget_min && data.budget_max) {
        return data.budget_min <= data.budget_max;
      }
      return true;
    },
    {
      message: 'Minimum budget cannot exceed maximum budget',
      path: ['budget_min'],
    }
  )
  .refine(
    (data) => {
      // If single budget is provided, it should be within range if range is also provided
      if (data.budget && data.budget_min && data.budget_max) {
        return data.budget >= data.budget_min && data.budget <= data.budget_max;
      }
      return true;
    },
    {
      message: 'Budget must be within the specified range',
      path: ['budget'],
    }
  );

// Schema for updating a job (all fields optional)
export const updateJobSchema = baseCreateJobSchema.partial();
// Schema for job status update
export const updateJobStatusSchema = z.object({
  status: z.enum(['draft', 'posted', 'in_progress', 'completed', 'cancelled']),
  reason: z.string().max(500).optional(),
});
// Schema for assigning contractor
export const assignContractorSchema = z.object({
  contractor_id: z.string().uuid('Invalid contractor ID'),
  bid_id: z.string().uuid('Invalid bid ID').optional(),
});
export class JobValidator {
  /**
   * Validate list parameters
   */
  validateListParams(params: any) {
    const result = listJobsSchema.safeParse(params);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.error.message}`);
    }
    return result.data;
  }
  /**
   * Validate job creation data
   */
  validateCreateJobData(data: any) {
    const result = createJobSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
  }
  /**
   * Validate job update data
   */
  validateUpdateJobData(data: any) {
    const result = updateJobSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
  }
  /**
   * Validate status update
   */
  validateStatusUpdate(data: any) {
    const result = updateJobStatusSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.error.message}`);
    }
    return result.data;
  }
  /**
   * Validate contractor assignment
   */
  validateContractorAssignment(data: any) {
    const result = assignContractorSchema.safeParse(data);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.error.message}`);
    }
    return result.data;
  }
  /**
   * Validate photo URLs
   */
  validatePhotoUrls(urls: string[]): string[] {
    if (!urls || !Array.isArray(urls)) return [];
    const validUrls: string[] = [];
    for (const url of urls) {
      try {
        const parsed = new URL(url);
        // Only allow HTTPS URLs for security
        if (parsed.protocol === 'https:') {
          // Check for common image extensions or image hosting domains
          const isImage =
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(parsed.pathname) ||
            parsed.hostname.includes('cloudinary') ||
            parsed.hostname.includes('s3') ||
            parsed.hostname.includes('storage.googleapis') ||
            parsed.hostname.includes('supabase');
          if (isImage) {
            validUrls.push(url);
          }
        }
      } catch {
        // Invalid URL, skip it
      }
    }
    if (validUrls.length > 20) {
      return validUrls.slice(0, 20);
    }
    return validUrls;
  }
  /**
   * Validate search query
   */
  validateSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';
    // Sanitize and limit length
    const sanitized = sanitize.searchQuery(query);
    // Check for SQL injection patterns
    if (!sanitize.isValidSearchTerm(sanitized)) {
      throw new Error('Invalid search query');
    }
    return sanitized;
  }
  /**
   * Validate pagination cursor
   */
  validateCursor(cursor: string): string {
    if (!cursor) return '';
    // Cursor should be an ISO date string
    try {
      const date = new Date(cursor);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid cursor');
      }
      return cursor;
    } catch {
      throw new Error('Invalid cursor format');
    }
  }
  /**
   * Validate job filters
   */
  validateFilters(filters: any) {
    const schema = z.object({
      status: z.array(z.enum(['draft', 'posted', 'in_progress', 'completed', 'cancelled'])).optional(),
      category: z.array(z.string()).optional(),
      budgetMin: z.number().positive().optional(),
      budgetMax: z.number().positive().optional(),
      location: z.string().optional(),
      radius: z.number().positive().max(100).optional(), // miles
      hasPhotos: z.boolean().optional(),
      isSeriousBuyer: z.boolean().optional(),
      urgency: z.enum(['immediate', 'urgent', 'soon', 'planned', 'monitor']).optional(),
    });
    const result = schema.safeParse(filters);
    if (!result.success) {
      throw new Error(`Invalid filters: ${result.error.message}`);
    }
    return result.data;
  }
}