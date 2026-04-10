import { useCallback } from 'react';
import { logger } from '../../utils/logger';
import type { UseFormReturn } from './types';

// ============================================================================
// ADDITIONAL HOOKS (field array + persistence)
// ============================================================================

/**
 * Hook for managing array fields in forms
 */
const useFieldArray = <T>(
  name: string,
  form: UseFormReturn<Record<string, unknown>>
) => {
  const value = (form.values[name] as T[] | undefined) || [];

  const append = useCallback(
    (item: T) => {
      form.setFieldValue(name as keyof Record<string, unknown>, [
        ...value,
        item,
      ]);
    },
    [form, name, value]
  );

  const prepend = useCallback(
    (item: T) => {
      form.setFieldValue(name as keyof Record<string, unknown>, [
        item,
        ...value,
      ]);
    },
    [form, name, value]
  );

  const remove = useCallback(
    (index: number) => {
      const newValue = value.filter((_, i) => i !== index);
      form.setFieldValue(name as keyof Record<string, unknown>, newValue);
    },
    [form, name, value]
  );

  const insert = useCallback(
    (index: number, item: T) => {
      const newValue = [...value];
      newValue.splice(index, 0, item);
      form.setFieldValue(name as keyof Record<string, unknown>, newValue);
    },
    [form, name, value]
  );

  const move = useCallback(
    (from: number, to: number) => {
      const newValue = [...value];
      const [removed] = newValue.splice(from, 1);
      newValue.splice(to, 0, removed!);
      form.setFieldValue(name as keyof Record<string, unknown>, newValue);
    },
    [form, name, value]
  );

  const swap = useCallback(
    (indexA: number, indexB: number) => {
      const newValue = [...value];
      [newValue[indexA], newValue[indexB]] = [
        newValue[indexB]!,
        newValue[indexA]!,
      ];
      form.setFieldValue(name as keyof Record<string, unknown>, newValue);
    },
    [form, name, value]
  );

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
const useFormPersistence = <T>(formKey: string, form: UseFormReturn<T>) => {
  const saveForm = useCallback(async () => {
    try {
      const {
        AsyncStorage,
      } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(
        `form_${formKey}`,
        JSON.stringify({
          values: form.values,
          touched: form.touched,
        })
      );
    } catch (error) {
      logger.error('Failed to save form', error);
    }
  }, [formKey, form.values, form.touched]);

  const loadForm = useCallback(async () => {
    try {
      const {
        AsyncStorage,
      } = require('@react-native-async-storage/async-storage');
      const saved = await AsyncStorage.getItem(`form_${formKey}`);
      if (saved) {
        const { values, touched } = JSON.parse(saved);
        form.setValues(values);
        form.setTouched(touched);
      }
    } catch (error) {
      logger.error('Failed to load form', error);
    }
  }, [formKey, form]);

  const clearSavedForm = useCallback(async () => {
    try {
      const {
        AsyncStorage,
      } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(`form_${formKey}`);
    } catch (error) {
      logger.error('Failed to clear saved form', error);
    }
  }, [formKey]);

  return {
    saveForm,
    loadForm,
    clearSavedForm,
  };
};
