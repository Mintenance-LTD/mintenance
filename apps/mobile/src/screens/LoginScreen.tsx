import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { useAccessibleText } from '../hooks/useAccessibleText';
import { useHaptics } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const TRUST_ITEMS = [
  { icon: 'shield-checkmark-outline' as const, label: 'Secure' },
  { icon: 'checkmark-circle-outline' as const, label: 'Verified' },
  { icon: 'people-outline' as const, label: 'Trusted' },
];

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signIn, loading } = useAuth();

  // Development mode test credentials
  const isDev = __DEV__ || process.env.NODE_ENV === 'development';

  // Dynamic text scaling for accessibility
  const headerTitleText = useAccessibleText(28);
  const buttonText = useAccessibleText(18);
  const linkText = useAccessibleText(14);

  // Haptic feedback
  const haptics = useHaptics();

  // Internationalization
  const { t, auth, common, getErrorMessage } = useI18n();

  const handleLogin = async () => {
    haptics.buttonPress();
    setErrorMessage(null);

    if (!email || !password) {
      haptics.error();
      setErrorMessage(String(t('auth.fillAllFields', 'Please fill in all fields')));
      return;
    }

    try {
      haptics.formSubmit();
      await signIn(email, password);
      haptics.loginSuccess();
    } catch (error) {
      haptics.loginFailed();
      setErrorMessage(String(getErrorMessage('loginFailed', error.message)));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} testID="login-screen">
        {/* Header with brand and trust indicators */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode='contain'
              accessible={false}
            />
            <Text
              style={[styles.headerTitle, headerTitleText.textStyle]}
              accessibilityRole='header'
            >
              Mintenance
            </Text>
          </View>
          <Text
            style={styles.headerSubtitle}
            accessibilityRole='text'
          >
            Connect homeowners and contractors easily
          </Text>

          {/* Trust indicators */}
          <View style={styles.trustRow}>
            {TRUST_ITEMS.map((item) => (
              <View key={item.label} style={styles.trustPill}>
                <Ionicons name={item.icon} size={13} color={theme.colors.textSecondary} />
                <Text style={styles.trustText}>{item.label}</Text>
              </View>
            ))}
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
            {/* Form heading */}
            <View style={styles.formHeading}>
              <Text style={styles.formTitle}>Sign in to your account</Text>
              <Text style={styles.formSubtitle}>Enter your details below</Text>
            </View>

              {errorMessage ? (
                <Banner
                  message={errorMessage}
                  variant='error'
                  testID='login-error-banner'
                />
              ) : null}

              {/* Login Form */}
              <View style={styles.formContainer}>
                <Input
                  testID="email-input"
                  label={String(auth.email())}
                  placeholder={String(auth.email())}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  leftIcon='mail-outline'
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                  accessibilityHint={String(
                    t(
                      'auth.emailHint',
                      'Please enter your email address to sign in'
                    )
                  )}
                  textContentType='emailAddress'
                  autoComplete='email'
                  variant='outline'
                  size='lg'
                  fullWidth
                  required
                  containerStyle={{ marginBottom: 16 }}
                />

                <Input
                  testID="password-input"
                  label={String(auth.password())}
                  placeholder={String(auth.password())}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  leftIcon='lock-closed-outline'
                  secureTextEntry
                  accessibilityHint={String(
                    t(
                      'auth.passwordHint',
                      'Please enter your password to sign in'
                    )
                  )}
                  textContentType='password'
                  autoComplete='password'
                  variant='outline'
                  size='lg'
                  fullWidth
                  required
                />

                {/* Forgot password link (right-aligned) */}
                <TouchableOpacity
                  style={styles.forgotPasswordLink}
                  onPress={() => {
                    haptics.buttonPress();
                    navigation.navigate('ForgotPassword');
                  }}
                  accessibilityRole='button'
                  accessibilityLabel={String(auth.forgotPassword())}
                  accessibilityHint={String(
                    t(
                      'auth.forgotPasswordHint',
                      'Double tap to reset your password'
                    )
                  )}
                >
                  <Text style={[styles.forgotPasswordText, linkText.textStyle]}>
                    {String(auth.forgotPassword())}
                  </Text>
                </TouchableOpacity>

                {/* Loading Spinner */}
                {loading && (
                  <ActivityIndicator
                    testID="loading-spinner"
                    size="large"
                    color={theme.colors.primary}
                    style={{ marginVertical: 20 }}
                    accessibilityLabel="Signing in"
                  />
                )}

                {/* Log In Button */}
                <Button
                  variant='primary'
                  title={
                    loading ? String(t('auth.loggingIn')) : String(auth.login())
                  }
                  onPress={handleLogin}
                  disabled={loading}
                  loading={loading}
                  accessibilityLabel={
                    loading ? String(t('auth.loggingIn')) : String(auth.login())
                  }
                  fullWidth
                  style={{ borderRadius: theme.borderRadius.xxl, marginTop: 8 }}
                  textStyle={buttonText.textStyle as unknown}
                />
              </View>

            {/* Divider + Sign Up CTA */}
              <View style={styles.dividerSection}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>New to Mintenance?</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={{ paddingHorizontal: 24 }}>
                <Button
                  variant='outline'
                  title='Create Account'
                  onPress={() => {
                    haptics.buttonPress();
                    navigation.navigate('Register');
                  }}
                  accessibilityLabel={String(
                    t('auth.signUpForAccount', 'Sign up for new account')
                  )}
                  accessibilityHint={String(
                    t('auth.signUpHint', 'Double tap to create a new account')
                  )}
                  fullWidth
                  style={{ borderRadius: theme.borderRadius.xxl }}
                />
              </View>

              {/* Development Test Login Notice */}
              {isDev && (
                <View style={styles.devSection}>
                  <Text style={styles.devTitle}>Development Mode</Text>
                  <Text style={styles.devNote}>
                    Use test accounts from your local Supabase instance.
                    {'\n'}Create test users via: npm run create-test-users
                  </Text>
                </View>
              )}
          </ScrollView>
        </KeyboardAvoidingView>
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
    marginBottom: 10,
  },
  headerLogo: {
    width: 36,
    height: 36,
    marginRight: 10,
    backgroundColor: theme.colors.white,
    borderRadius: 8,
  },
  headerTitle: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 20,
    paddingBottom: 24,
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  // Development styles
  devSection: {
    marginTop: 16,
    marginHorizontal: 24,
    padding: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  devTitle: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  devNote: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
});

export default LoginScreen;
