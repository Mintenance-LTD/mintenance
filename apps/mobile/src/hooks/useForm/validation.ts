import { z } from 'zod';
import { validateSchema, ValidationError } from '../../types/schemas';

// ============================================================================
// TYPES (shared)
// ============================================================================

export interface FieldError {
  message: string;
  type: 'required' | 'validation' | 'custom';
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates a single field value using the provided zod schema.
 * Returns a FieldError if validation fails for this field, otherwise null.
 */
export const validateFieldValueWithSchema = async <
  T extends Record<string, unknown>,
  K extends keyof T,
>(
  validationSchema: z.ZodSchema<T> | undefined,
  values: T,
  name: K,
  value: T[K]
): Promise<FieldError | null> => {
  if (!validationSchema) return null;

  try {
    const testValues = { ...values, [name]: value };
    await validateSchema(validationSchema, testValues);
    return null;
  } catch (error) {
    if (error instanceof ValidationError) {
      const fieldPath = String(name);
      if (error.field === fieldPath) {
        return {
          message: error.message,
          type: 'validation' as const,
        };
      }
    }
    return null;
  }
};

/**
 * Validates all fields in the form and returns a map of errors.
 */
export const validateAllFieldsWithSchema = async <
  T extends Record<string, unknown>,
>(
  validationSchema: z.ZodSchema<T> | undefined,
  values: T
): Promise<Partial<Record<keyof T, FieldError>>> => {
  if (!validationSchema) return {};

  try {
    await validateSchema(validationSchema, values);
    return {};
  } catch (error) {
    if (error instanceof ValidationError) {
      const newErrors: Partial<Record<keyof T, FieldError>> = {};
      if (error.field) {
        const fieldName = error.field as keyof T;
        newErrors[fieldName] = {
          message: error.message,
          type: 'validation',
        };
      }
      return newErrors;
    }
    return {};
  }
};
