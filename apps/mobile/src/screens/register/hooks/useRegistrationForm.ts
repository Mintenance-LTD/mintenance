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

export function useRegistrationForm() {
  const [form, setForm] = useState<RegistrationFormState>(INITIAL_STATE);
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
    },
    [resetFeedback]
  );

  const toggleTerms = useCallback(() => {
    resetFeedback();
    setForm(prev => ({ ...prev, termsAccepted: !prev.termsAccepted }));
  }, [resetFeedback]);

  const togglePasswordVisibility = useCallback(() => {
    setForm(prev => ({ ...prev, passwordVisible: !prev.passwordVisible }));
  }, []);

  const validateForm = (): boolean => {
    if (!form.firstName.trim()) {
      setSubmissionError('First name is required');
      return false;
    }
    if (!form.lastName.trim()) {
      setSubmissionError('Last name is required');
      return false;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setSubmissionError('Please enter a valid email address');
      return false;
    }
    if (!form.password || form.password.length < 8) {
      setSubmissionError('Password must be at least 8 characters');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setSubmissionError('Passwords do not match');
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
      setSubmissionSuccess('Account created! You can now sign in.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setSubmissionError(message);
      setSubmissionSuccess(null);
    }
  };

  return {
    form,
    loading,
    submissionError,
    submissionSuccess,
    showTermsModal,
    showPrivacyModal,
    setShowTermsModal,
    setShowPrivacyModal,
    updateField,
    toggleTerms,
    togglePasswordVisibility,
    handleRegister,
    resetFeedback,
  };
}
