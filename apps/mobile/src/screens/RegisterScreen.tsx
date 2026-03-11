import React, { useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';
import { theme } from '../theme';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';
import { RoleSelector } from './register/components/RoleSelector';
import { TermsSection, TermsModal } from './register/components/TermsSection';
import { useRegistrationForm } from './register/hooks/useRegistrationForm';
import { PasswordStrengthBar } from '../components/ui/PasswordStrengthBar';

const STEPS = [
  { number: 1, label: 'Personal' },
  { number: 2, label: 'Contact' },
  { number: 3, label: 'Password' },
] as const;

interface FormProgressProps {
  currentStep: number;
}

const FormProgress: React.FC<FormProgressProps> = ({ currentStep }) => {
  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.row}>
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isFuture = step.number > currentStep;

          return (
            <React.Fragment key={step.number}>
              {index > 0 && (
                <View
                  style={[
                    progressStyles.line,
                    {
                      backgroundColor: isCompleted || isActive
                        ? '#10B981'
                        : '#EBEBEB',
                    },
                  ]}
                />
              )}
              <View style={progressStyles.stepColumn}>
                <View
                  style={[
                    progressStyles.circle,
                    isCompleted || isActive
                      ? { backgroundColor: '#10B981' }
                      : { backgroundColor: '#F7F7F7' },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        progressStyles.circleText,
                        isActive
                          ? { color: '#FFFFFF' }
                          : { color: '#B0B0B0' },
                      ]}
                    >
                      {step.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    progressStyles.label,
                    isActive
                      ? { color: '#10B981', fontWeight: '600' }
                      : isFuture
                        ? { color: '#B0B0B0' }
                        : { color: '#717171' },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  line: {
    height: 2,
    flex: 1,
    marginTop: 14,
    borderRadius: 1,
  },
  stepColumn: {
    alignItems: 'center',
    width: 56,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation?: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const {
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
  } = useRegistrationForm();

  const currentStep = useMemo(() => {
    if (form.email.trim().length > 0) return 3;
    if (form.firstName.trim().length > 0 && form.lastName.trim().length > 0) return 2;
    return 1;
  }, [form.firstName, form.lastName, form.email]);

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
            <Text style={styles.headerTitle} accessibilityRole='header'>Mintenance</Text>
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
            <SlideIn direction="up" distance={20} duration={400} delay={200}>
            <View style={styles.formHeading}>
              <Text style={styles.formTitle}>Get Started</Text>
              <Text style={styles.formSubtitle}>Fill in your details to create an account</Text>
            </View>
            </SlideIn>

            <FormProgress currentStep={currentStep} />

            <View style={styles.formContainer}>
              {submissionSuccess ? (
                <Banner message={submissionSuccess} variant='success' testID='register-success-banner' />
              ) : null}
              {submissionError ? (
                <Banner message={submissionError} variant='error' testID='register-error-banner' />
              ) : null}

              <RoleSelector
                role={form.role}
                onRoleChange={(role) => updateField('role', role)}
              />

              <Text style={styles.sectionLabel}>Personal Details</Text>

              <Input
                testID="first-name-input"
                label='First Name'
                placeholder='First Name'
                value={form.firstName}
                onChangeText={(v) => updateField('firstName', v)}
                onBlur={() => validateOnBlur('firstName')}
                errorText={fieldErrors.firstName}
                leftIcon='person-outline'
                autoCapitalize='words'
                accessibilityHint='Enter your first name'
                textContentType='givenName'
                autoComplete='given-name'
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <Input
                testID="last-name-input"
                label='Last Name'
                placeholder='Last Name'
                value={form.lastName}
                onChangeText={(v) => updateField('lastName', v)}
                onBlur={() => validateOnBlur('lastName')}
                errorText={fieldErrors.lastName}
                leftIcon='person-outline'
                autoCapitalize='words'
                accessibilityHint='Enter your last name'
                textContentType='familyName'
                autoComplete='family-name'
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <Text style={styles.sectionLabel}>Contact Information</Text>

              <Input
                testID="email-input"
                label='Email'
                placeholder='Email'
                value={form.email}
                onChangeText={(v) => updateField('email', v)}
                onBlur={() => validateOnBlur('email')}
                errorText={fieldErrors.email}
                leftIcon='mail-outline'
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                accessibilityHint='Enter your email address for account creation'
                textContentType='emailAddress'
                autoComplete='email'
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <Input
                label='Phone Number'
                placeholder='Phone Number'
                value={form.phoneNumber}
                onChangeText={(v) => updateField('phoneNumber', v)}
                leftIcon='call-outline'
                keyboardType='phone-pad'
                accessibilityHint='Enter your phone number for account verification'
                textContentType='telephoneNumber'
                autoComplete='tel'
                variant='outline'
                size='lg'
                fullWidth
              />

              <Text style={styles.sectionLabel}>Create Password</Text>

              <Input
                testID="password-input"
                label='Password'
                placeholder='Password'
                value={form.password}
                onChangeText={(v) => updateField('password', v)}
                onBlur={() => validateOnBlur('password')}
                errorText={fieldErrors.password}
                leftIcon='lock-closed-outline'
                rightIcon={form.passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={togglePasswordVisibility}
                secureTextEntry={!form.passwordVisible}
                accessibilityHint='Create a secure password with at least 8 characters'
                textContentType='newPassword'
                autoComplete='password-new'
                variant='outline'
                size='lg'
                fullWidth
                required
              />
              <PasswordStrengthBar password={form.password} />

              <Input
                testID="confirm-password-input"
                label='Confirm Password'
                placeholder='Confirm Password'
                value={form.confirmPassword}
                onChangeText={(v) => updateField('confirmPassword', v)}
                onBlur={() => validateOnBlur('confirmPassword')}
                errorText={fieldErrors.confirmPassword}
                leftIcon='lock-closed-outline'
                secureTextEntry
                accessibilityHint='Re-enter your password to confirm it matches'
                textContentType='newPassword'
                autoComplete='password-new'
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <TermsSection
                termsAccepted={form.termsAccepted}
                onToggleTerms={toggleTerms}
                onShowTerms={() => setShowTermsModal(true)}
                onShowPrivacy={() => setShowPrivacyModal(true)}
              />

              <Button
                testID={loading ? 'loading-spinner' : 'register-button'}
                variant='primary'
                title={loading ? 'Creating Account...' : 'Create Account'}
                onPress={handleRegister}
                disabled={loading}
                loading={loading}
                accessibilityLabel={loading ? 'Creating account' : 'Create account'}
                fullWidth
                style={{ borderRadius: 28, marginBottom: 16 }}
              />

              <View style={styles.loginSection}>
                <View style={styles.loginDivider} />
                <View style={styles.loginLinkContainer}>
                  <Text style={styles.loginPromptText}>Already have an account?</Text>
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
          title="Terms"
          testID="terms-modal"
          onClose={() => setShowTermsModal(false)}
        />
        <TermsModal
          visible={showPrivacyModal}
          title="Privacy"
          testID="privacy-modal"
          onClose={() => setShowPrivacyModal(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
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
    color: '#222222',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#717171',
    textAlign: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 32,
  },
  formHeading: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 15,
    color: '#717171',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  loginSection: {
    marginTop: 8,
  },
  loginDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EBEBEB',
    marginBottom: 16,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  loginPromptText: {
    color: '#717171',
    fontSize: 15,
  },
  loginLinkText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default RegisterScreen;
