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
  useAccessibleText(16); // inputText (style uses fixed size)
  // const { colors } = useAccessibleColors();

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
    } catch (error: any) {
      haptics.loginFailed();
      setErrorMessage(String(getErrorMessage('loginFailed', error.message)));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} testID="login-screen">
        {/* Dark Blue Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.headerLogo}
            resizeMode='contain'
          />
          <Text style={[styles.headerTitle, headerTitleText.textStyle]}>
            Mintenance
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Connect homeowners and contractors easily
        </Text>
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
          {errorMessage ? (
            <Banner
              message={errorMessage}
              variant='error'
              testID='login-error-banner'
            />
          ) : null}
          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Email Input with Enhanced Component */}
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
            />

            {/* Password Input with Enhanced Component */}
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

            {/* Loading Spinner */}
            {loading && (
              <ActivityIndicator 
                testID="loading-spinner"
                size="large" 
                color={theme.colors.primary} 
                style={{ marginVertical: 20 }}
              />
            )}

            {/* Green Log In Button */}
            <Button
              variant='success'
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
              style={{ borderRadius: theme.borderRadius.xxl, marginBottom: 32 }}
              textStyle={buttonText.textStyle as any}
            />

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

            {/* Links */}
            <View style={styles.linksContainer}>
              <TouchableOpacity
                style={styles.linkButton}
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
                <Text style={[styles.linkText, linkText.textStyle]}>
                  {String(auth.forgotPassword())}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  haptics.buttonPress();
                  navigation.navigate('Register');
                }}
                accessibilityRole='button'
                accessibilityLabel={String(
                  t('auth.signUpForAccount', 'Sign up for new account')
                )}
                accessibilityHint={String(
                  t('auth.signUpHint', 'Double tap to create a new account')
                )}
              >
                <Text style={[styles.linkText, linkText.textStyle]}>
                  {String(auth.register())}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    // fontSize handled by useAccessibleText hook
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    textAlign: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Development styles
  devSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  devTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  devNote: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default LoginScreen;
