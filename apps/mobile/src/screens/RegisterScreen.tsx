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

              <Input
                testID="first-name-input"
                label='First Name'
                placeholder='First Name'
                value={form.firstName}
                onChangeText={(v) => updateField('firstName', v)}
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

              <Input
                testID="email-input"
                label='Email'
                placeholder='Email'
                value={form.email}
                onChangeText={(v) => updateField('email', v)}
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

              <Input
                testID="password-input"
                label='Password'
                placeholder='Password'
                value={form.password}
                onChangeText={(v) => updateField('password', v)}
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
                variant='success'
                title={loading ? 'Creating Account...' : 'Create Account'}
                onPress={handleRegister}
                disabled={loading}
                loading={loading}
                accessibilityLabel={loading ? 'Creating account' : 'Create account'}
                fullWidth
                style={{ borderRadius: theme.borderRadius.xxl, marginBottom: 24 }}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.loginLinkContainer}
                accessibilityRole='link'
                accessibilityLabel='Already have an account? Sign in'
                accessibilityHint='Double tap to go to the login screen'
              >
                <Text style={styles.loginLinkText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
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
    backgroundColor: theme.colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formContainer: {
    flex: 1,
  },
  loginLinkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline' as const,
  },
});

export default RegisterScreen;
