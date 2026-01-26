/**
 * Job Details Validator - Validation for single job operations
 */
import { z } from 'zod';
// Temporary sanitize functions
const sanitize = {
  text: (input: string, maxLength?: number) => {
    if (!input) return '';
    const cleaned = input.trim().replace(/[<>]/g, '');
    return maxLength ? cleaned.substring(0, maxLength) : cleaned;
  },
  jobDescription: (input: string) => sanitize.text(input, 5000),
  address: (input: string) => sanitize.text(input, 256),
  url: (input: string) => {
    try {
      const url = new URL(input);
      return ['http:', 'https:'].includes(url.protocol) ? input : '';
    } catch {
      return '';
    }
  }
};
// Schema for full job update
export const fullUpdateSchema = z.object({
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(200)
    .transform(val => sanitize.text(val, 200))
    .optional(),
  description: z.string()
    .max(5000)
    .transform(val => sanitize.jobDescription(val))
    .optional(),
  category: z.string()
    .max(128)
    .transform(val => sanitize.text(val, 128))
    .optional(),
  budget: z.coerce.number()
    .positive('Budget must be positive')
    .max(1000000, 'Budget cannot exceed $1,000,000')
    .optional(),
  budgetMin: z.coerce.number()
    .positive()
    .optional(),
  budgetMax: z.coerce.number()
    .positive()
    .optional(),
  location: z.string()
    .max(256)
    .transform(val => sanitize.address(val))
    .optional(),
  city: z.string()
    .max(100)
    .transform(val => sanitize.text(val, 100))
    .optional(),
  postcode: z.string()
    .max(20)
    .transform(val => sanitize.text(val, 20))
    .optional(),
  propertyType: z.enum(['house', 'apartment', 'condo', 'townhouse', 'commercial', 'other'])
    .optional(),
  accessInfo: z.string()
    .max(500)
    .transform(val => sanitize.text(val, 500))
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'emergency'])
    .optional(),
  images: z.array(
    z.string()
      .url('Invalid image URL')
      .transform(val => sanitize.url(val))
  ).max(20, 'Maximum 20 images allowed')
    .optional(),
  requirements: z.array(
    z.string()
      .max(200)
      .transform(val => sanitize.text(val, 200))
  ).max(10, 'Maximum 10 requirements')
    .optional(),
  startDate: z.string()
    .datetime()
    .optional(),
  endDate: z.string()
    .datetime()
    .optional(),
  flexibleTimeline: z.boolean()
    .optional(),
  analyzeWithAI: z.boolean()
    .default(true)
    .optional(),
  runBuildingSurvey: z.boolean()
    .default(false)
    .optional(),
}).refine(
  (data) => {
    // Validate budget range
    if (data.budgetMin && data.budgetMax) {
      return data.budgetMin <= data.budgetMax;
    }
    return true;
  },
  {
    message: 'Minimum budget cannot exceed maximum budget',
    path: ['budgetMin'],
  }
).refine(
  (data) => {
    // Validate date range
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Start date must be before end date',
    path: ['startDate'],
  }
).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided',
  }
);
// Schema for partial job update
export const partialUpdateSchema = z.object({
  title: z.string()
    .min(1)
    .max(200)
    .transform(val => sanitize.text(val, 200))
    .optional(),
  description: z.string()
    .max(5000)
    .transform(val => sanitize.jobDescription(val))
    .optional(),
  status: z.enum(['draft', 'posted', 'in_progress', 'completed', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'emergency'])
    .optional(),
  budget: z.coerce.number()
    .positive()
    .max(1000000)
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
  }
);
// Schema for status update
export const statusUpdateSchema = z.object({
  status: z.enum(['draft', 'posted', 'in_progress', 'completed', 'cancelled']),
  reason: z.string()
    .max(500)
    .transform(val => sanitize.text(val, 500))
    .optional(),
});
export class JobDetailsValidator {
  /**
   * Validate full update data
   */
  validateFullUpdate(data: Record<string, unknown>) {
    const result = fullUpdateSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e: unknown) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
  }
  /**
   * Validate partial update data
   */
  validatePartialUpdate(data: Record<string, unknown>) {
    const result = partialUpdateSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e: unknown) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
  }
  /**
   * Validate status update
   */
  validateStatusUpdate(data: Record<string, unknown>) {
    const result = statusUpdateSchema.safeParse(data);
    if (!result.success) {
      const errors = result.error.issues.map(
        (e: unknown) => `${e.path.join('.')}: ${e.message}`
      );
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    return result.data;
  }
  /**
   * Validate job ID format
   */
  validateJobId(id: string): boolean {
    // UUID v4 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
  /**
   * Validate image URLs
   */
  validateImageUrls(urls: string[]): string[] {
    const validUrls: string[] = [];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const url of urls) {
      try {
        const parsed = new URL(url);
        const extension = parsed.pathname.toLowerCase().substring(parsed.pathname.lastIndexOf('.'));
        if (allowedExtensions.includes(extension)) {
          validUrls.push(sanitize.url(url));
        }
      } catch {
        // Invalid URL, skip
      }
    }
    return validUrls;
  }
}