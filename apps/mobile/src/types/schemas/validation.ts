import { z } from 'zod';
import { EmailSchema, PasswordSchema, UUIDSchema } from './common';
import { JobCategorySchema, type JobCategory } from './jobs';
import { UserRoleSchema } from './auth';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]!;
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        firstError.code
      );
    }
    throw error;
  }
};



// ============================================================================
// COMMON VALIDATORS
// ============================================================================










