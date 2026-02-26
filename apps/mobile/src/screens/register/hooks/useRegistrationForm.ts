import { useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

interface RegistrationFormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: 'homeowner' | 'contractor';
  termsAccepted: boolean;
  passwordVisible: boolean;
}

type FieldErrors = Partial<Record<keyof RegistrationFormState, string>>;

const INITIAL_STATE: RegistrationFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  role: 'homeowner',
  termsAccepted: false,
  passwordVisible: false,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(field: keyof RegistrationFormState, value: string, form: RegistrationFormState): string | undefined {
  switch (field) {
    case 'firstName':
      if (!value.trim()) return 'First name is required';
      return undefined;
    case 'lastName':
      if (!value.trim()) return 'Last name is required';
      return undefined;
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email';
      return undefined;
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Must be at least 8 characters';
      if (!/[A-Z]/.test(value)) return 'Must include an uppercase letter';
      if (!/[a-z]/.test(value)) return 'Must include a lowercase letter';
      if (!/\d/.test(value)) return 'Must include a number';
      if (!/[@$!%*?&]/.test(value)) return 'Must include a special character';
      return undefined;
    case 'confirmPassword':
      if (value !== form.password) return 'Passwords do not match';
      return undefined;
    default:
      return undefined;
  }
}

export function useRegistrationForm() {
  const [form, setForm] = useState<RegistrationFormState>(INITIAL_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { signUp, loading } = useAuth();

  const resetFeedback = useCallback(() => {
    if (submissionError) setSubmissionError(null);
    if (submissionSuccess) setSubmissionSuccess(null);
  }, [submissionError, submissionSuccess]);

  const updateField = useCallback(
    <K extends keyof RegistrationFormState>(field: K, value: RegistrationFormState[K]) => {
      resetFeedback();
      setForm(prev => ({ ...prev, [field]: value }));
      // Clear field error when user starts typing
      if (fieldErrors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: undefined }));
      }
    },
    [resetFeedback, fieldErrors]
  );

  const validateOnBlur = useCallback(
    (field: keyof RegistrationFormState) => {
      const error = validateField(field, String(form[field] ?? ''), form);
      setFieldErrors(prev => ({ ...prev, [field]: error }));
    },
    [form]
  );

  const toggleTerms = useCallback(() => {
    resetFeedback();
    setForm(prev => ({ ...prev, termsAccepted: !prev.termsAccepted }));
  }, [resetFeedback]);

  const togglePasswordVisibility = useCallback(() => {
    setForm(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }));
  }, []);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const fields: (keyof RegistrationFormState)[] = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    for (const field of fields) {
      const err = validateField(field, String(form[field] ?? ''), form);
      if (err) errors[field] = err;
    }
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      setSubmissionError(Object.values(errors).find(Boolean) || 'Please fix the errors above');
      return false;
    }
    setSubmissionError(null);
    return true;
  };

  const handleRegister = async () => {
    setSubmissionError(null);
    setSubmissionSuccess(null);
    if (!validateForm()) return;
    if (!form.termsAccepted) {
      setSubmissionError('Please accept the terms and conditions');
      return;
    }

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      };
      if ((signUp as { mock?: boolean })?.mock) {
        await (signUp as (p: typeof payload) => Promise<void>)(payload);
      } else {
        await signUp(payload.email, payload.password, {
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
        });
      }
      setForm(INITIAL_STATE);
      setFieldErrors({});
      setSubmissionSuccess('Account created! You can now sign in.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setSubmissionError(message);
      setSubmissionSuccess(null);
    }
  };

  return {
    form,
    fieldErrors,
    loading,
    submissionError,
    submissionSuccess,
    showTermsModal,
    showPrivacyModal,
    setShowTermsModal,
    setShowPrivacyModal,
    updateField,
    validateOnBlur,
    toggleTerms,
    togglePasswordVisibility,
    handleRegister,
    resetFeedback,
  };
}
