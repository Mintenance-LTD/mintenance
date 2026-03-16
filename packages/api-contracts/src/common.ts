/**
 * Common API schemas and types shared across all endpoints.
 */
import { z } from 'zod';

// ── Reusable primitives ────────────────────────────────────────────

export const uuidSchema = z.string().uuid('Invalid ID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const cursorPaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

// ── API response envelopes ─────────────────────────────────────────

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    field: z.string().optional(),
  }),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
});

export function apiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    message: z.string().optional(),
  });
}

// ── Inferred types ─────────────────────────────────────────────────

export type PaginationInput = z.infer<typeof paginationSchema>;
export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
