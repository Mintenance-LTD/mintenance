import { useState, useCallback, useMemo, useRef } from 'react';
import { z } from 'zod';
import { validateSchema, ValidationError } from '../types/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface FieldError {
  message: string;
  type: 'required' | 'validation' | 'custom';
}

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
  handleSubmit: (onSubmit?: (values: T) => Promise<void> | void) => Promise<void>;
  resetForm: (newValues?: Partial<T>) => void;
  validateForm: () => Promise<boolean>;
  validateField: <K extends keyof T>(name: K) => Promise<boolean>;
  
  // Utilities
  setValues: (values: Partial<T>) => void;
  setErrors: (errors: Partial<Record<keyof T, FieldError>>) => void;
  setTouched: (touched: Partial<Record<keyof T, boolean>>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useForm = <T extends Record<string, any>>(
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

  // ============================================================================
  // STATE
  // ============================================================================

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Partial<Record<keyof T, FieldError>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValuesRef = useRef(initialValues);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  }, [values]);

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  const validateFieldValue = useCallback(async <K extends keyof T>(
    name: K,
    value: T[K]
  ): Promise<FieldError | null> => {
    if (!validationSchema) return null;

    try {
      // Validate the entire form with the new value
      const testValues = { ...values, [name]: value };
      await validateSchema(validationSchema, testValues);
      return null;
    } catch (error) {
      if (error instanceof ValidationError) {
        // Extract field-specific error
        const fieldPath = String(name);
        const fieldIssue = error.errors.find(issue => 
          issue.path.join('.') === fieldPath
        );
        
        if (fieldIssue) {
          return {
            message: fieldIssue.message,
            type: 'validation',
          };
        }
      }
      return null;
    }
  }, [validationSchema, values]);

  const validateAllFields = useCallback(async (): Promise<Partial<Record<keyof T, FieldError>>> => {
    if (!validationSchema) return {};

    try {
      await validateSchema(validationSchema, values);
      return {};
    } catch (error) {
      if (error instanceof ValidationError) {
        const newErrors: Partial<Record<keyof T, FieldError>> = {};
        
        error.errors.forEach(issue => {
          const fieldName = issue.path[0] as keyof T;
          if (fieldName) {
            newErrors[fieldName] = {
              message: issue.message,
              type: 'validation',
            };
          }
        });
        
        return newErrors;
      }
      return {};
    }
  }, [validationSchema, values]);

  // ============================================================================
  // FIELD HELPERS
  // ============================================================================

  const setFieldValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [name]: value }));
    
    // Clear error when value changes
    if (errors[name]) {
      setErrorsState(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Validate on change if enabled
    if (validateOnChange) {
      validateFieldValue(name, value).then(error => {
        if (error) {
          setErrorsState(prev => ({ ...prev, [name]: error }));
        }
      });
    }
  }, [errors, validateOnChange, validateFieldValue]);

  const setFieldError = useCallback(<K extends keyof T>(name: K, error: FieldError | null) => {
    setErrorsState(prev => {
      if (error) {
        return { ...prev, [name]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
    });
  }, []);

  const setFieldTouched = useCallback(<K extends keyof T>(name: K, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [name]: isTouched }));
    
    // Validate on blur if enabled and field is being touched
    if (validateOnBlur && isTouched) {
      validateFieldValue(name, values[name]).then(error => {
        if (error) {
          setErrorsState(prev => ({ ...prev, [name]: error }));
        }
      });
    }
  }, [validateOnBlur, validateFieldValue, values]);

  const getFieldProps = useCallback(<K extends keyof T>(name: K): FormField<T[K]> => {
    return {
      value: values[name],
      error: errors[name],
      isTouched: touched[name] || false,
      onChange: (value: T[K]) => setFieldValue(name, value),
      onBlur: () => setFieldTouched(name, true),
      onFocus: () => {
        // Mark as touched on focus for better UX
        if (!touched[name]) {
          setFieldTouched(name, false);
        }
      },
    };
  }, [values, errors, touched, setFieldValue, setFieldTouched]);

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

  const validateField = useCallback(async <K extends keyof T>(name: K): Promise<boolean> => {
    const error = await validateFieldValue(name, values[name]);
    setFieldError(name, error);
    return error === null;
  }, [validateFieldValue, values, setFieldError]);

  const handleSubmit = useCallback(async (
    customOnSubmit?: (values: T) => Promise<void> | void
  ) => {
    setIsSubmitting(true);
    
    try {
      // Mark all fields as touched
      const allFieldsTouched = Object.keys(values).reduce((acc, key) => {
        acc[key as keyof T] = true;
        return acc;
      }, {} as Record<keyof T, boolean>);
      setTouchedState(allFieldsTouched);
      
      // Validate form
      const isFormValid = await validateForm();
      
      if (!isFormValid) {
        return;
      }
      
      // Submit form
      const submitHandler = customOnSubmit || onSubmit;
      if (submitHandler) {
        await submitHandler(values);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      // You might want to set form-level errors here
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateForm, onSubmit]);

  const resetForm = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
    setValuesState(resetValues);
    setErrorsState({});
    setTouchedState({});
    setIsSubmitting(false);
    
    if (newValues) {
      initialValuesRef.current = resetValues;
    }
  }, [initialValues]);

  // ============================================================================
  // UTILITY HELPERS
  // ============================================================================

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setErrors = useCallback((newErrors: Partial<Record<keyof T, FieldError>>) => {
    setErrorsState(newErrors);
  }, []);

  const setTouched = useCallback((newTouched: Partial<Record<keyof T, boolean>>) => {
    setTouchedState(prev => ({ ...prev, ...newTouched }));
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  // ============================================================================
  // RETURN VALUE
  // ============================================================================

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    
    // Field helpers
    getFieldProps,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    
    // Form helpers
    handleSubmit,
    resetForm,
    validateForm,
    validateField,
    
    // Utilities
    setValues,
    setErrors,
    setTouched,
    setSubmitting,
  };
};

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook for managing array fields in forms
 */
export const useFieldArray = <T>(
  name: string,
  form: UseFormReturn<any>
) => {
  const value = form.values[name] as T[] || [];

  const append = useCallback((item: T) => {
    form.setFieldValue(name, [...value, item]);
  }, [form, name, value]);

  const prepend = useCallback((item: T) => {
    form.setFieldValue(name, [item, ...value]);
  }, [form, name, value]);

  const remove = useCallback((index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    form.setFieldValue(name, newValue);
  }, [form, name, value]);

  const insert = useCallback((index: number, item: T) => {
    const newValue = [...value];
    newValue.splice(index, 0, item);
    form.setFieldValue(name, newValue);
  }, [form, name, value]);

  const move = useCallback((from: number, to: number) => {
    const newValue = [...value];
    const [removed] = newValue.splice(from, 1);
    newValue.splice(to, 0, removed);
    form.setFieldValue(name, newValue);
  }, [form, name, value]);

  const swap = useCallback((indexA: number, indexB: number) => {
    const newValue = [...value];
    [newValue[indexA], newValue[indexB]] = [newValue[indexB], newValue[indexA]];
    form.setFieldValue(name, newValue);
  }, [form, name, value]);

  return {
    fields: value,
    append,
    prepend,
    remove,
    insert,
    move,
    swap,
  };
};

/**
 * Hook for form persistence to AsyncStorage
 */
export const useFormPersistence = <T>(
  formKey: string,
  form: UseFormReturn<T>
) => {
  const saveForm = useCallback(async () => {
    try {
      const { AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(
        `form_${formKey}`,
        JSON.stringify({
          values: form.values,
          touched: form.touched,
        })
      );
    } catch (error) {
      console.error('Failed to save form:', error);
    }
  }, [formKey, form.values, form.touched]);

  const loadForm = useCallback(async () => {
    try {
      const { AsyncStorage } = require('@react-native-async-storage/async-storage');
      const saved = await AsyncStorage.getItem(`form_${formKey}`);
      if (saved) {
        const { values, touched } = JSON.parse(saved);
        form.setValues(values);
        form.setTouched(touched);
      }
    } catch (error) {
      console.error('Failed to load form:', error);
    }
  }, [formKey, form]);

  const clearSavedForm = useCallback(async () => {
    try {
      const { AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(`form_${formKey}`);
    } catch (error) {
      console.error('Failed to clear saved form:', error);
    }
  }, [formKey]);

  return {
    saveForm,
    loadForm,
    clearSavedForm,
  };
};

export default useForm;
