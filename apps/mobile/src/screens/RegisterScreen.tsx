/**
 * RegisterScreen — Mint Editorial v2 redesign (2026-05-22).
 *
 * Implements the mobile create-account frame from
 * `.design-bundle/.../redesign-v2/auth.html` (MSignUp-style, condensed
 * for the 3-step wizard).
 *
 *   - Back chevron + thin progress bar with "n / N" counter.
 *   - Instrument-style display headline per step.
 *   - Step body delegated to the existing WizardStep* components.
 *   - Bottom primary mint CTA + "Already have one? Sign in →" link.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FadeIn, SlideIn } from '../components/animations/primitives';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';

import { Button } from '../components/ui/Button';
import { Banner } from '../components/ui/Banner';
import { TermsModal } from './register/components/TermsSection';
import { WizardStep1Identity } from './register/components/WizardStep1Identity';
import { WizardStep2Name } from './register/components/WizardStep2Name';
import { WizardStep3Contact } from './register/components/WizardStep3Contact';
import { useRegistrationForm } from './register/hooks/useRegistrationForm';
import { me } from '../design-system/mint-editorial';
import { useScreenCaptureGuard } from '../hooks/useScreenCaptureGuard';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface Props {
  navigation?: RegisterScreenNavigationProp;
}

const STEP_COPY = [
  {
    title: 'Create your account',
    sub: 'Takes about 90 seconds. You can change role later.',
  },
  {
    title: 'Who are we addressing?',
    sub: 'Homeowners and tradespeople see this on your profile.',
  },
  {
    title: 'How should we reach you?',
    sub: 'Used for job alerts and bid notifications. Never shared.',
  },
] as const;

const RegisterScreen: React.FC<Props> = () => {
  useScreenCaptureGuard();

  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Register'>>();
  const initialRole = route.params?.role;
  const {
    form,
    fieldErrors,
    loading,
    submissionError,
    submissionSuccess,
    showTermsModal,
    showPrivacyModal,
    currentStep,
    totalSteps,
    setShowTermsModal,
    setShowPrivacyModal,
    updateField,
    validateOnBlur,
    toggleTerms,
    togglePasswordVisibility,
    goToNextStep,
    goToPreviousStep,
    handleRegister,
  } = useRegistrationForm({
    initialRole,
    onSignUpSuccess: (email) => {
      navigation.replace('EmailVerificationPending', { email });
    },
  });

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const primaryLabel = isLastStep
    ? loading
      ? 'Creating Account…'
      : 'Create Account'
    : 'Continue';

  const handlePrimary = () => {
    if (isLastStep) {
      void handleRegister();
    } else {
      goToNextStep();
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      goToPreviousStep();
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  };

  const stepIdx = Math.min(currentStep, STEP_COPY.length) - 1;
  const stepCopy = STEP_COPY[stepIdx] ?? STEP_COPY[0];
  const progress = (currentStep / totalSteps) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <FadeIn duration={400}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole='button'
              accessibilityLabel={
                isFirstStep ? 'Close registration' : 'Previous step'
              }
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name='chevron-back' size={22} color={me.ink2} />
            </TouchableOpacity>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            <Text style={styles.progressCounter}>
              {currentStep} / {totalSteps}
            </Text>
          </View>
        </FadeIn>

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            <SlideIn direction='up' distance={16} duration={400} delay={100}>
              <View style={styles.formHeading}>
                <Text style={styles.formTitle} accessibilityRole='header'>
                  {stepCopy.title}
                </Text>
                <Text style={styles.formSubtitle}>{stepCopy.sub}</Text>
              </View>
            </SlideIn>

            <View style={styles.formContainer}>
              {submissionSuccess ? (
                <Banner
                  mint
                  message={submissionSuccess}
                  variant='success'
                  testID='register-success-banner'
                />
              ) : null}
              {submissionError ? (
                <Banner
                  mint
                  message={submissionError}
                  variant='error'
                  testID='register-error-banner'
                />
              ) : null}

              {currentStep === 1 && (
                <WizardStep1Identity
                  email={form.email}
                  password={form.password}
                  confirmPassword={form.confirmPassword}
                  passwordVisible={form.passwordVisible}
                  termsAccepted={form.termsAccepted}
                  errors={{
                    email: fieldErrors.email,
                    password: fieldErrors.password,
                    confirmPassword: fieldErrors.confirmPassword,
                  }}
                  onChangeEmail={(v) => updateField('email', v)}
                  onChangePassword={(v) => updateField('password', v)}
                  onChangeConfirmPassword={(v) =>
                    updateField('confirmPassword', v)
                  }
                  onBlurEmail={() => validateOnBlur('email')}
                  onBlurPassword={() => validateOnBlur('password')}
                  onBlurConfirmPassword={() =>
                    validateOnBlur('confirmPassword')
                  }
                  onTogglePasswordVisibility={togglePasswordVisibility}
                  onToggleTerms={toggleTerms}
                  onShowTerms={() => setShowTermsModal(true)}
                  onShowPrivacy={() => setShowPrivacyModal(true)}
                />
              )}

              {currentStep === 2 && (
                <WizardStep2Name
                  firstName={form.firstName}
                  lastName={form.lastName}
                  role={form.role}
                  errors={{
                    firstName: fieldErrors.firstName,
                    lastName: fieldErrors.lastName,
                  }}
                  onChangeFirstName={(v) => updateField('firstName', v)}
                  onChangeLastName={(v) => updateField('lastName', v)}
                  onBlurFirstName={() => validateOnBlur('firstName')}
                  onBlurLastName={() => validateOnBlur('lastName')}
                  onChangeRole={(role) => updateField('role', role)}
                />
              )}

              {currentStep === 3 && (
                <WizardStep3Contact
                  phoneNumber={form.phoneNumber}
                  role={form.role}
                  errors={{ phoneNumber: fieldErrors.phoneNumber }}
                  onChangePhoneNumber={(v) => updateField('phoneNumber', v)}
                  onBlurPhoneNumber={() => validateOnBlur('phoneNumber')}
                />
              )}

              <Button
                mint
                testID={
                  loading && isLastStep ? 'loading-spinner' : 'register-button'
                }
                variant='primary'
                title={primaryLabel}
                onPress={handlePrimary}
                disabled={loading}
                loading={loading && isLastStep}
                accessibilityLabel={
                  isLastStep
                    ? loading
                      ? 'Creating account'
                      : 'Create account'
                    : 'Continue to next step'
                }
                fullWidth
                style={{ marginTop: 24 }}
              />
            </View>

            <View style={styles.loginSection}>
              <Text style={styles.loginPromptText}>Already have one?</Text>
              <TouchableOpacity
                onPress={() => navigation?.navigate('Login')}
                accessibilityRole='link'
                accessibilityLabel='Already have an account? Sign in'
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.loginLinkText}>Sign in →</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <TermsModal
          visible={showTermsModal}
          title='Terms'
          testID='terms-modal'
          onClose={() => setShowTermsModal(false)}
        />
        <TermsModal
          visible={showPrivacyModal}
          title='Privacy'
          testID='privacy-modal'
          onClose={() => setShowPrivacyModal(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: me.bg,
  },
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: me.bg2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: me.brand,
    borderRadius: 2,
  },
  progressCounter: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink3,
    minWidth: 32,
    textAlign: 'right',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: me.bg,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },
  formHeading: {
    marginBottom: 20,
  },
  formTitle: {
    fontFamily: me.font.display,
    fontSize: 30,
    lineHeight: 34,
    color: me.ink,
    marginBottom: 4,
    letterSpacing: me.displayTracking,
  },
  formSubtitle: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: 'transparent',
  },
  loginSection: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  loginPromptText: {
    color: me.ink2,
    fontSize: 13,
  },
  loginLinkText: {
    color: me.brand,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default RegisterScreen;
