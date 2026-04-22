import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
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
import { FormProgress } from './register/components/FormProgress';
import { WizardStep1Identity } from './register/components/WizardStep1Identity';
import { WizardStep2Name } from './register/components/WizardStep2Name';
import { WizardStep3Contact } from './register/components/WizardStep3Contact';
import { useRegistrationForm } from './register/hooks/useRegistrationForm';
import { theme } from '../theme';
import { useScreenCaptureGuard } from '../hooks/useScreenCaptureGuard';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface Props {
  navigation?: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = () => {
  // SECURITY: prevent screenshots / screen recording of the password
  // field during registration.
  useScreenCaptureGuard();

  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Register'>>();
  // Phase 2 — WelcomeScreen hands off a role when the user taps a
  // tile. Direct deep-links to Register don't pass one; the hook
  // falls back to its default ('homeowner').
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
    // Phase 1.2 — on successful signUp, go to the email-confirmation
    // pending screen so the user has a clear next step. Email-confirm
    // is ON in prod; they can't sign in until they click the link.
    onSignUpSuccess: (email) => {
      navigation.replace('EmailVerificationPending', { email });
    },
  });

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const primaryLabel = isLastStep
    ? loading
      ? 'Creating Account...'
      : 'Create Account'
    : 'Continue';

  const handlePrimary = () => {
    if (isLastStep) {
      void handleRegister();
    } else {
      goToNextStep();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <FadeIn duration={500}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.headerLogo}
                resizeMode='contain'
                accessible={false}
              />
              <Text style={styles.headerTitle} accessibilityRole='header'>
                Mintenance
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>Create your free account</Text>
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
            <SlideIn direction='up' distance={20} duration={400} delay={200}>
              <View style={styles.formHeading}>
                <Text style={styles.formTitle}>
                  Step {currentStep} of {totalSteps}
                </Text>
                <Text style={styles.formSubtitle}>
                  {currentStep === 1
                    ? 'Choose the email and password for your account.'
                    : currentStep === 2
                      ? 'Tell us who we should address you as.'
                      : 'How contractors / homeowners reach you.'}
                </Text>
              </View>
            </SlideIn>

            <FormProgress currentStep={currentStep} />

            <View style={styles.formContainer}>
              {submissionSuccess ? (
                <Banner
                  message={submissionSuccess}
                  variant='success'
                  testID='register-success-banner'
                />
              ) : null}
              {submissionError ? (
                <Banner
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

              <View style={styles.navRow}>
                {!isFirstStep && (
                  <TouchableOpacity
                    onPress={goToPreviousStep}
                    style={styles.backButton}
                    accessibilityRole='button'
                    accessibilityLabel='Go to previous step'
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name='chevron-back'
                      size={20}
                      color={theme.colors.textPrimary}
                    />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.primaryWrap}>
                  <Button
                    testID={
                      loading && isLastStep
                        ? 'loading-spinner'
                        : 'register-button'
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
                    style={{ borderRadius: 28 }}
                  />
                </View>
              </View>

              <View style={styles.loginSection}>
                <View style={styles.loginDivider} />
                <View style={styles.loginLinkContainer}>
                  <Text style={styles.loginPromptText}>
                    Already have an account?
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    accessibilityRole='link'
                    accessibilityLabel='Already have an account? Sign in'
                    accessibilityHint='Double tap to go to the login screen'
                  >
                    <Text style={styles.loginLinkText}> Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLogo: {
    width: 36,
    height: 36,
    marginRight: 10,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: 20,
    paddingBottom: 32,
  },
  formHeading: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  primaryWrap: {
    flex: 1,
  },
  loginSection: {
    marginTop: 8,
  },
  loginDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  loginPromptText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  loginLinkText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default RegisterScreen;
