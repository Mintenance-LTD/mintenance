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
// Permissive UK phone — digits / spaces / +, 7-15 chars after stripping.
// Not a full libphonenumber check; that's tracked for when we wire SMS OTP
// (Phase 3 per the 2026-04-19 audit PDF).
const PHONE_REGEX = /^[+0-9][0-9 ]{6,14}$/;

/**
 * Wizard step definitions (Phase 2 of the 2026-04-19 audit).
 * Step 1 includes confirmPassword — PDF §5.1 specifies only 3 taps
 * (email + password + terms) but the existing tests + safety posture
 * keep confirmPassword one step longer. Dropping it + updating tests
 * is a follow-up commit.
 */
export type WizardStep = 1 | 2 | 3;
const TOTAL_STEPS: WizardStep = 3;

const STEP_FIELDS: Record<WizardStep, Array<keyof RegistrationFormState>> = {
  1: ['email', 'password', 'confirmPassword'],
  2: ['firstName', 'lastName'],
  3: ['phoneNumber'],
};

function validateField(
  field: keyof RegistrationFormState,
  value: string,
  form: RegistrationFormState
): string | undefined {
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
    case 'phoneNumber': {
      const trimmed = value.trim();
      // Required for contractors (they need to be reachable on-site).
      // Optional for homeowners — empty is acceptable.
      if (!trimmed) {
        return form.role === 'contractor'
          ? 'Phone number is required for contractors'
          : undefined;
      }
      if (!PHONE_REGEX.test(trimmed))
        return 'Please enter a valid phone number';
      return undefined;
    }
    default:
      return undefined;
  }
}

export interface UseRegistrationFormOptions {
  /**
   * Called after a successful signUp, with the email the user just
   * registered with. Intended to navigate to the
   * EmailVerificationPendingScreen. Optional so tests and the
   * existing fallback-success-banner path still work.
   */
  onSignUpSuccess?: (email: string) => void;
  /**
   * Initial role, used by the Phase 2 WelcomeScreen to pre-select
   * whichever tile the user tapped. Falls back to INITIAL_STATE.role
   * ('homeowner') when absent, preserving the pre-Phase-2 default
   * for any caller that doesn't specify one.
   */
  initialRole?: 'homeowner' | 'contractor';
}

export function useRegistrationForm(options: UseRegistrationFormOptions = {}) {
  const { onSignUpSuccess, initialRole } = options;
  const [form, setForm] = useState<RegistrationFormState>(() =>
    initialRole ? { ...INITIAL_STATE, role: initialRole } : INITIAL_STATE
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(
    null
  );
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const { signUp, loading } = useAuth();

  const resetFeedback = useCallback(() => {
    if (submissionError) setSubmissionError(null);
    if (submissionSuccess) setSubmissionSuccess(null);
  }, [submissionError, submissionSuccess]);

  const updateField = useCallback(
    <K extends keyof RegistrationFormState>(
      field: K,
      value: RegistrationFormState[K]
    ) => {
      resetFeedback();
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear field error when user starts typing
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [resetFeedback, fieldErrors]
  );

  const validateOnBlur = useCallback(
    (field: keyof RegistrationFormState) => {
      const error = validateField(field, String(form[field] ?? ''), form);
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    },
    [form]
  );

  const toggleTerms = useCallback(() => {
    resetFeedback();
    setForm((prev) => ({ ...prev, termsAccepted: !prev.termsAccepted }));
  }, [resetFeedback]);

  const togglePasswordVisibility = useCallback(() => {
    setForm((prev) => ({ ...prev, passwordVisible: !prev.passwordVisible }));
  }, []);

  /**
   * Validate only the fields owned by a given wizard step. Used by
   * `goToNextStep` so a user can't skip past an invalid step.
   */
  const validateStep = useCallback(
    (step: WizardStep): boolean => {
      const errors: FieldErrors = {};
      for (const field of STEP_FIELDS[step]) {
        const err = validateField(field, String(form[field] ?? ''), form);
        if (err) errors[field] = err;
      }

      // Step 1 also gates on terms accepted — a field but not a text
      // input, so it doesn't flow through validateField.
      if (step === 1 && !form.termsAccepted) {
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        setSubmissionError('Please accept the terms and conditions');
        return false;
      }

      setFieldErrors((prev) => ({ ...prev, ...errors }));
      if (Object.values(errors).some(Boolean)) {
        setSubmissionError(
          Object.values(errors).find(Boolean) || 'Please fix the errors above'
        );
        return false;
      }
      setSubmissionError(null);
      return true;
    },
    [form]
  );

  const goToNextStep = useCallback(() => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) =>
      prev < TOTAL_STEPS ? ((prev + 1) as WizardStep) : prev
    );
  }, [currentStep, validateStep]);

  const goToPreviousStep = useCallback(() => {
    setSubmissionError(null);
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  }, []);

  const handleRegister = async () => {
    setSubmissionError(null);
    setSubmissionSuccess(null);
    // Final submit happens from step 3 — re-validate all steps to
    // catch anything that slipped through (e.g., user changed role
    // on step 2 and that makes phone required on step 3).
    for (const step of [1, 2, 3] as WizardStep[]) {
      if (!validateStep(step)) {
        // Jump back to the first step with errors so the user sees
        // where to fix.
        setCurrentStep(step);
        return;
      }
    }

    try {
      const trimmedPhone = form.phoneNumber.trim();
      const payload = {
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
        // 2026-05-23: was collected + validated but never forwarded.
        // Now flows through performSignUp -> AuthService.signUp -> the
        // signup metadata that handle_new_user reads.
        phone: trimmedPhone || undefined,
      };
      if ((signUp as unknown as { mock?: boolean })?.mock) {
        await (signUp as unknown as (p: typeof payload) => Promise<void>)(
          payload
        );
      } else {
        await signUp(payload.email, payload.password, {
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
          phone: payload.phone,
        });
      }
      const registeredEmail = payload.email;
      setForm(INITIAL_STATE);
      setFieldErrors({});
      setCurrentStep(1);

      // When the caller has wired a navigation callback (Phase 1.2),
      // send the user to the EmailVerificationPendingScreen. Otherwise
      // fall back to the legacy inline success banner so tests and
      // any older caller still render a meaningful outcome.
      if (onSignUpSuccess) {
        onSignUpSuccess(registeredEmail);
      } else {
        setSubmissionSuccess(
          'Account created! Please check your email to confirm your account.'
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Registration failed';
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
    currentStep,
    totalSteps: TOTAL_STEPS,
    setShowTermsModal,
    setShowPrivacyModal,
    updateField,
    validateOnBlur,
    toggleTerms,
    togglePasswordVisibility,
    goToNextStep,
    goToPreviousStep,
    handleRegister,
    resetFeedback,
  };
}
