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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/types';
import { theme } from '../theme';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';
import { RoleSelector } from './register/components/RoleSelector';
import { TermsSection, TermsModal } from './register/components/TermsSection';
import { useRegistrationForm } from './register/hooks/useRegistrationForm';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
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

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            {/* Form heading */}
            <View style={styles.formHeading}>
              <Text style={styles.formTitle}>Get Started</Text>
              <Text style={styles.formSubtitle}>Fill in your details to create an account</Text>
            </View>

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

              {/* Personal Details */}
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

              {/* Contact Information */}
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

              {/* Create Password */}
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
                style={{ borderRadius: theme.borderRadius.xxl, marginBottom: 16 }}
              />

              {/* Sign In link */}
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
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.white,
    borderRadius: 8,
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
    backgroundColor: theme.colors.background,
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
  },
  formSubtitle: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  loginSection: {
    marginTop: 8,
  },
  loginDivider: {
    height: 1,
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
