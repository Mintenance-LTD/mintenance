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
      const firstError = error.errors[0]!;
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.'),
        firstError.code
      );
    }
    throw error;
  }
};

const safeValidateSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationError } => {
  try {
    const validData = validateSchema(schema, data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error };
    }
    return {
      success: false,
      error: new ValidationError('Unknown validation error'),
    };
  }
};

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

const isValidEmail = (email: string): boolean => {
  return EmailSchema.safeParse(email).success;
};

const isValidPassword = (password: string): boolean => {
  return PasswordSchema.safeParse(password).success;
};

const isValidUUID = (id: string): boolean => {
  return UUIDSchema.safeParse(id).success;
};

const isValidJobCategory = (category: string): category is JobCategory => {
  return JobCategorySchema.safeParse(category).success;
};

const isValidUserRole = (
  role: string
): role is z.infer<typeof UserRoleSchema> => {
  return UserRoleSchema.safeParse(role).success;
};
