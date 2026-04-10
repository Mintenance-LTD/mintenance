import { z } from 'zod';
import type { FieldError } from './validation';

// ============================================================================
// TYPES
// ============================================================================

export type { FieldError } from './validation';

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, FieldError>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormField<T> {
  value: T;
  error?: FieldError;
  isTouched: boolean;
  onChange: (value: T) => void;
  onBlur: () => void;
  onFocus: () => void;
}

export interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: z.ZodSchema<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: T) => Promise<void> | void;
  onValidationError?: (errors: Partial<Record<keyof T, FieldError>>) => void;
}

export interface UseFormReturn<T> {
  // State
  values: T;
  errors: Partial<Record<keyof T, FieldError>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;

  // Field helpers
  getFieldProps: <K extends keyof T>(name: K) => FormField<T[K]>;
  setFieldValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(name: K, error: FieldError | null) => void;
  setFieldTouched: <K extends keyof T>(name: K, touched?: boolean) => void;

  // Form helpers
  handleSubmit: (
    onSubmit?: (values: T) => Promise<void> | void
  ) => Promise<void>;
  resetForm: (newValues?: Partial<T>) => void;
  validateForm: () => Promise<boolean>;
  validateField: <K extends keyof T>(name: K) => Promise<boolean>;

  // Utilities
  setValues: (values: Partial<T>) => void;
  setErrors: (errors: Partial<Record<keyof T, FieldError>>) => void;
  setTouched: (touched: Partial<Record<keyof T, boolean>>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
}
