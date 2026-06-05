import { renderHook, act } from '@testing-library/react-native';
import { z } from 'zod';
import useForm from '../useForm';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

interface LoginForm extends Record<string, unknown> {
  name: string;
  email: string;
}

const initialValues: LoginForm = { name: '', email: '' };

// Schema where the `name` field is the first declared, so its error surfaces
// first from zod when both are invalid (zod reports errors[0]).
const nameFirstSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
}) as unknown as z.ZodSchema<LoginForm>;

// Schema where `email` is the first declared field.
const emailFirstSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required'),
}) as unknown as z.ZodSchema<LoginForm>;

describe('useForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION + DERIVED STATE
  // ==========================================================================
  describe('initialization', () => {
    it('initializes with provided values and empty meta-state', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isValid).toBe(true); // no errors yet
      expect(result.current.isDirty).toBe(false);
    });
  });

  // ==========================================================================
  // setFieldValue
  // ==========================================================================
  describe('setFieldValue', () => {
    it('updates a single field and marks form dirty', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldValue('name', 'Alex');
      });
      expect(result.current.values.name).toBe('Alex');
      expect(result.current.isDirty).toBe(true);
    });

    it('clears an existing error for the field on change', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldError('name', {
          message: 'bad',
          type: 'custom',
        });
      });
      expect(result.current.errors.name).toBeDefined();

      act(() => {
        result.current.setFieldValue('name', 'Alex');
      });
      expect(result.current.errors.name).toBeUndefined();
    });

    it('validates on change when validateOnChange=true and sets error', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: nameFirstSchema,
          validateOnChange: true,
        })
      );

      // Set name empty -> name fails min(1) first -> error attached to name
      await act(async () => {
        result.current.setFieldValue('name', '');
        await Promise.resolve();
      });

      expect(result.current.errors.name).toEqual({
        message: 'Name is required',
        type: 'validation',
      });
    });

    it('does NOT set an error on change when value is valid', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: nameFirstSchema,
          validateOnChange: true,
        })
      );

      // Provide valid values for both fields so nothing fails
      await act(async () => {
        result.current.setFieldValue('email', 'a@b.com');
        await Promise.resolve();
      });
      await act(async () => {
        result.current.setFieldValue('name', 'Alex');
        await Promise.resolve();
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  // ==========================================================================
  // setFieldError
  // ==========================================================================
  describe('setFieldError', () => {
    it('sets an error and flips isValid to false', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldError('email', {
          message: 'Required',
          type: 'required',
        });
      });
      expect(result.current.errors.email).toEqual({
        message: 'Required',
        type: 'required',
      });
      expect(result.current.isValid).toBe(false);
    });

    it('clears an error when passed null', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldError('email', {
          message: 'Required',
          type: 'required',
        });
      });
      act(() => {
        result.current.setFieldError('email', null);
      });
      expect(result.current.errors.email).toBeUndefined();
      expect(result.current.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // setFieldTouched + validateOnBlur
  // ==========================================================================
  describe('setFieldTouched', () => {
    it('marks a field touched (default true)', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldTouched('name');
      });
      expect(result.current.touched.name).toBe(true);
    });

    it('can mark a field untouched explicitly', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldTouched('name', false);
      });
      expect(result.current.touched.name).toBe(false);
    });

    it('validates on blur when validateOnBlur=true and value invalid', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues, // name: '' -> fails
          validationSchema: nameFirstSchema,
          validateOnBlur: true,
        })
      );

      await act(async () => {
        result.current.setFieldTouched('name', true);
        await Promise.resolve();
      });

      expect(result.current.errors.name).toEqual({
        message: 'Name is required',
        type: 'validation',
      });
    });

    it('does not validate on blur when validateOnBlur=false', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: nameFirstSchema,
          validateOnBlur: false,
        })
      );

      await act(async () => {
        result.current.setFieldTouched('name', true);
        await Promise.resolve();
      });

      expect(result.current.errors.name).toBeUndefined();
    });
  });

  // ==========================================================================
  // getFieldProps
  // ==========================================================================
  describe('getFieldProps', () => {
    it('returns value/error/isTouched and wired callbacks', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      let props = result.current.getFieldProps('name');
      expect(props.value).toBe('');
      expect(props.error).toBeUndefined();
      expect(props.isTouched).toBe(false);

      // onChange wires through to setFieldValue
      act(() => {
        props.onChange('Sam');
      });
      expect(result.current.values.name).toBe('Sam');

      // onBlur marks touched true
      act(() => {
        props = result.current.getFieldProps('name');
        props.onBlur();
      });
      expect(result.current.touched.name).toBe(true);
    });

    it('onFocus marks field touched=false only if not already touched', () => {
      const { result } = renderHook(() => useForm({ initialValues }));

      // First focus: not yet touched -> sets touched=false (creates key)
      act(() => {
        result.current.getFieldProps('email').onFocus();
      });
      expect(result.current.touched.email).toBe(false);

      // Now mark it touched
      act(() => {
        result.current.setFieldTouched('email', true);
      });
      expect(result.current.touched.email).toBe(true);

      // Focus again: already truthy-touched -> onFocus does NOT reset to false
      act(() => {
        result.current.getFieldProps('email').onFocus();
      });
      expect(result.current.touched.email).toBe(true);
    });

    it('surfaces an existing error through props', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldError('email', {
          message: 'x',
          type: 'custom',
        });
      });
      expect(result.current.getFieldProps('email').error).toEqual({
        message: 'x',
        type: 'custom',
      });
    });
  });

  // ==========================================================================
  // validateField
  // ==========================================================================
  describe('validateField', () => {
    it('returns false and sets error when field invalid', async () => {
      const { result } = renderHook(() =>
        useForm({ initialValues, validationSchema: nameFirstSchema })
      );

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.validateField('name');
      });
      expect(ok).toBe(false);
      expect(result.current.errors.name).toEqual({
        message: 'Name is required',
        type: 'validation',
      });
    });

    it('returns true and clears error when field valid', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues: { name: 'Alex', email: 'a@b.com' },
          validationSchema: nameFirstSchema,
        })
      );
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.validateField('name');
      });
      expect(ok).toBe(true);
      expect(result.current.errors.name).toBeUndefined();
    });

    it('returns true when there is no validation schema', async () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.validateField('name');
      });
      expect(ok).toBe(true);
    });
  });

  // ==========================================================================
  // validateForm
  // ==========================================================================
  describe('validateForm', () => {
    it('returns true and no errors when schema satisfied', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues: { name: 'Alex', email: 'a@b.com' },
          validationSchema: nameFirstSchema,
        })
      );
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.validateForm();
      });
      expect(ok).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('returns false, sets errors and calls onValidationError when invalid', async () => {
      const onValidationError = jest.fn();
      const { result } = renderHook(() =>
        useForm({
          initialValues, // email invalid (first field in emailFirstSchema)
          validationSchema: emailFirstSchema,
          onValidationError,
        })
      );
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.validateForm();
      });
      expect(ok).toBe(false);
      expect(result.current.errors.email).toEqual({
        message: 'Invalid email',
        type: 'validation',
      });
      expect(onValidationError).toHaveBeenCalledWith(result.current.errors);
    });

    it('returns true when no schema present', async () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.validateForm();
      });
      expect(ok).toBe(true);
    });
  });

  // ==========================================================================
  // handleSubmit
  // ==========================================================================
  describe('handleSubmit', () => {
    it('marks all fields touched and calls onSubmit when valid', async () => {
      const onSubmit = jest.fn(() => Promise.resolve());
      const { result } = renderHook(() =>
        useForm({
          initialValues: { name: 'Alex', email: 'a@b.com' },
          validationSchema: nameFirstSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Alex',
        email: 'a@b.com',
      });
      expect(result.current.touched).toEqual({ name: true, email: true });
      expect(result.current.isSubmitting).toBe(false);
    });

    it('blocks submit and sets errors when invalid', async () => {
      const onSubmit = jest.fn();
      const { result } = renderHook(() =>
        useForm({
          initialValues,
          validationSchema: emailFirstSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(result.current.errors.email).toBeDefined();
      expect(result.current.isSubmitting).toBe(false);
    });

    it('uses a custom onSubmit handler over the configured one', async () => {
      const configured = jest.fn();
      const custom = jest.fn(() => Promise.resolve());
      const { result } = renderHook(() =>
        useForm({
          initialValues: { name: 'Alex', email: 'a@b.com' },
          validationSchema: nameFirstSchema,
          onSubmit: configured,
        })
      );

      await act(async () => {
        await result.current.handleSubmit(custom);
      });

      expect(custom).toHaveBeenCalledWith({ name: 'Alex', email: 'a@b.com' });
      expect(configured).not.toHaveBeenCalled();
    });

    it('submits without error when no submit handler is provided', async () => {
      const { result } = renderHook(() =>
        useForm({
          initialValues: { name: 'Alex', email: 'a@b.com' },
          validationSchema: nameFirstSchema,
        })
      );
      await act(async () => {
        await result.current.handleSubmit();
      });
      expect(result.current.isSubmitting).toBe(false);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs and recovers when onSubmit throws', async () => {
      const boom = new Error('submit failed');
      const onSubmit = jest.fn(() => Promise.reject(boom));
      const { result } = renderHook(() =>
        useForm({
          initialValues: { name: 'Alex', email: 'a@b.com' },
          validationSchema: nameFirstSchema,
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(logger.error).toHaveBeenCalledWith('Form submission error', boom);
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  // ==========================================================================
  // resetForm
  // ==========================================================================
  describe('resetForm', () => {
    it('resets values/errors/touched to initial state', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setFieldValue('name', 'Alex');
        result.current.setFieldError('email', { message: 'x', type: 'custom' });
        result.current.setFieldTouched('name', true);
        result.current.setSubmitting(true);
      });
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.values).toEqual(initialValues);
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isDirty).toBe(false);
    });

    it('resets to merged new values and updates the dirty baseline', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.resetForm({ name: 'Default' });
      });
      expect(result.current.values).toEqual({ name: 'Default', email: '' });
      // new baseline -> not dirty
      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.setFieldValue('name', 'Changed');
      });
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.setFieldValue('name', 'Default');
      });
      // back to the reset baseline
      expect(result.current.isDirty).toBe(false);
    });
  });

  // ==========================================================================
  // UTILITY SETTERS
  // ==========================================================================
  describe('utility setters', () => {
    it('setValues merges partial values', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setValues({ name: 'Merged' });
      });
      expect(result.current.values).toEqual({ name: 'Merged', email: '' });
    });

    it('setErrors replaces the error map wholesale', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setErrors({
          email: { message: 'bad', type: 'validation' },
        });
      });
      expect(result.current.errors).toEqual({
        email: { message: 'bad', type: 'validation' },
      });
      expect(result.current.isValid).toBe(false);
    });

    it('setTouched merges touched flags', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setTouched({ name: true });
      });
      act(() => {
        result.current.setTouched({ email: true });
      });
      expect(result.current.touched).toEqual({ name: true, email: true });
    });

    it('setSubmitting toggles the submitting flag', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      act(() => {
        result.current.setSubmitting(true);
      });
      expect(result.current.isSubmitting).toBe(true);
      act(() => {
        result.current.setSubmitting(false);
      });
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  // ==========================================================================
  // isDirty / isValid derived flags
  // ==========================================================================
  describe('derived flags', () => {
    it('isDirty reflects deep value equality with initial', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      expect(result.current.isDirty).toBe(false);
      act(() => {
        result.current.setFieldValue('email', 'a@b.com');
      });
      expect(result.current.isDirty).toBe(true);
      act(() => {
        result.current.setFieldValue('email', '');
      });
      expect(result.current.isDirty).toBe(false);
    });

    it('isValid is true only when the error map is empty', () => {
      const { result } = renderHook(() => useForm({ initialValues }));
      expect(result.current.isValid).toBe(true);
      act(() => {
        result.current.setFieldError('name', { message: 'x', type: 'custom' });
      });
      expect(result.current.isValid).toBe(false);
      act(() => {
        result.current.setFieldError('name', null);
      });
      expect(result.current.isValid).toBe(true);
    });
  });

  it('cleans up on unmount without throwing', () => {
    const { unmount } = renderHook(() => useForm({ initialValues }));
    expect(() => unmount()).not.toThrow();
  });
});
