import { z } from 'zod';
import { DateSchema } from './common';

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  message: z.string().optional(),
  timestamp: DateSchema.optional(),
});

const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    field: z.string().optional(),
  }),
  timestamp: DateSchema.optional(),
});

const PaginatedResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
    has_next: z.boolean(),
    has_prev: z.boolean(),
  }),
});

// Type exports
type ApiSuccess<T = unknown> = z.infer<typeof ApiSuccessSchema> & {
  data: T;
};
type ApiError = z.infer<typeof ApiErrorSchema>;
type PaginatedResponse<T = unknown> = z.infer<
  typeof PaginatedResponseSchema
> & { data: T[] };
