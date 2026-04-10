import { useState, useCallback, useMemo, useRef } from 'react';
import { logger } from '../utils/logger';
import {
  validateFieldValueWithSchema,
  validateAllFieldsWithSchema,
  type FieldError,
} from './useForm/validation';
import type {
  FormField,
  FormState,
  UseFormOptions,
  UseFormReturn,
} from './useForm/types';

// Re-export types for backward compatibility
// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

const useForm = <T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> => {
  const {
    initialValues,
    validationSchema,
    validateOnChange = false,
    validateOnBlur = true,
    onSubmit,
    onValidationError,
  } = options;

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<
    Partial<Record<keyof T, FieldError>>
  >({});
  const [touched, setTouchedState] = useState<
    Partial<Record<keyof T, boolean>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValuesRef = useRef(initialValues);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  }, [values]);

  const validateFieldValue = useCallback(
    async <K extends keyof T>(
      name: K,
      value: T[K]
    ): Promise<FieldError | null> => {
      return validateFieldValueWithSchema(
        validationSchema,
        values,
        name,
        value
      );
    },
    [validationSchema, values]
  );

  const validateAllFields = useCallback(async (): Promise<
    Partial<Record<keyof T, FieldError>>
  > => {
    return validateAllFieldsWithSchema(validationSchema, values);
  }, [validationSchema, values]);

  // ============================================================================
  // FIELD HELPERS
  // ============================================================================

  const setFieldValue = useCallback(
    <K extends keyof T>(name: K, value: T[K]) => {
      setValuesState((prev) => ({ ...prev, [name]: value }));

      if (errors[name]) {
        setErrorsState((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }

      if (validateOnChange) {
        validateFieldValue(name, value).then((error) => {
          if (error) {
            setErrorsState((prev) => ({ ...prev, [name]: error }));
          }
        });
      }
    },
    [errors, validateOnChange, validateFieldValue]
  );

  const setFieldError = useCallback(
    <K extends keyof T>(name: K, error: FieldError | null) => {
      setErrorsState((prev) => {
        if (error) {
          return { ...prev, [name]: error };
        } else {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        }
      });
    },
    []
  );

  const setFieldTouched = useCallback(
    <K extends keyof T>(name: K, isTouched = true) => {
      setTouchedState((prev) => ({ ...prev, [name]: isTouched }));

      if (validateOnBlur && isTouched) {
        validateFieldValue(name, values[name]).then((error) => {
          if (error) {
            setErrorsState((prev) => ({ ...prev, [name]: error }));
          }
        });
      }
    },
    [validateOnBlur, validateFieldValue, values]
  );

  const getFieldProps = useCallback(
    <K extends keyof T>(name: K): FormField<T[K]> => {
      return {
        value: values[name],
        error: errors[name],
        isTouched: touched[name] || false,
        onChange: (value: T[K]) => setFieldValue(name, value),
        onBlur: () => setFieldTouched(name, true),
        onFocus: () => {
          if (!touched[name]) {
            setFieldTouched(name, false);
          }
        },
      };
    },
    [values, errors, touched, setFieldValue, setFieldTouched]
  );

  // ============================================================================
  // FORM HELPERS
  // ============================================================================

  const validateForm = useCallback(async (): Promise<boolean> => {
    const newErrors = await validateAllFields();
    setErrorsState(newErrors);

    if (Object.keys(newErrors).length > 0) {
      onValidationError?.(newErrors);
      return false;
    }

    return true;
  }, [validateAllFields, onValidationError]);

  const validateField = useCallback(
    async <K extends keyof T>(name: K): Promise<boolean> => {
      const error = await validateFieldValue(name, values[name]);
      setFieldError(name, error);
      return error === null;
    },
    [validateFieldValue, values, setFieldError]
  );

  const handleSubmit = useCallback(
    async (customOnSubmit?: (values: T) => Promise<void> | void) => {
      setIsSubmitting(true);

      try {
        const allFieldsTouched = Object.keys(values).reduce(
          (acc, key) => {
            acc[key as keyof T] = true;
            return acc;
          },
          {} as Record<keyof T, boolean>
        );
        setTouchedState(allFieldsTouched);

        const isFormValid = await validateForm();

        if (!isFormValid) {
          return;
        }

        const submitHandler = customOnSubmit || onSubmit;
        if (submitHandler) {
          await submitHandler(values);
        }
      } catch (error) {
        logger.error('Form submission error', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit]
  );

  const resetForm = useCallback(
    (newValues?: Partial<T>) => {
      const resetValues = newValues
        ? { ...initialValues, ...newValues }
        : initialValues;
      setValuesState(resetValues);
      setErrorsState({});
      setTouchedState({});
      setIsSubmitting(false);

      if (newValues) {
        initialValuesRef.current = resetValues;
      }
    },
    [initialValues]
  );

  // ============================================================================
  // UTILITY HELPERS
  // ============================================================================

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  const setErrors = useCallback(
    (newErrors: Partial<Record<keyof T, FieldError>>) => {
      setErrorsState(newErrors);
    },
    []
  );

  const setTouched = useCallback(
    (newTouched: Partial<Record<keyof T, boolean>>) => {
      setTouchedState((prev) => ({ ...prev, ...newTouched }));
    },
    []
  );

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    getFieldProps,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    handleSubmit,
    resetForm,
    validateForm,
    validateField,
    setValues,
    setErrors,
    setTouched,
    setSubmitting,
  };
};

export default useForm;
