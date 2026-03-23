import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FadeIn, SlideIn } from '../components/animations/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';

import { useAccessibleText } from '../hooks/useAccessibleText';
import { useHaptics } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';
import { theme, gradients } from '../theme';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const TRUST_ITEMS = [
  { icon: 'shield-checkmark-outline' as const, label: 'Secure' },
  { icon: 'checkmark-circle-outline' as const, label: 'Verified' },
  { icon: 'people-outline' as const, label: 'Trusted' },
];

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signIn, loading } = useAuth();

  const togglePasswordVisibility = () => setPasswordVisible((prev) => !prev);

  const isDev = __DEV__ || process.env.NODE_ENV === 'development';

  const headerTitleText = useAccessibleText(28);
  const buttonText = useAccessibleText(18);
  const linkText = useAccessibleText(14);

  const haptics = useHaptics();
  const { t, auth, common, getErrorMessage } = useI18n();

  const handleLogin = async () => {
    haptics.buttonPress();
    setErrorMessage(null);

    if (!email || !password) {
      haptics.error();
      setErrorMessage(String(t('auth.fillAllFields', { defaultValue: 'Please fill in all fields' })));
      return;
    }

    try {
      haptics.formSubmit();
      await signIn(email, password);
      haptics.loginSuccess();
    } catch (error) {
      haptics.loginFailed();
      setErrorMessage(String(getErrorMessage('loginFailed', error instanceof Error ? error.message : String(error))));
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container} testID="login-screen">
        <FadeIn duration={500}>
        <LinearGradient
          colors={gradients.heroGreen}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 24 }]}
        >
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
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
          <Text style={styles.headerSubtitle} accessibilityRole='text'>
            {String(t('auth.tagline'))}
          </Text>

          <View style={styles.trustRow}>
            {TRUST_ITEMS.map((item) => (
              <View key={item.label} style={styles.trustPill}>
                <Ionicons name={item.icon} size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.trustText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
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
              <Text style={styles.formTitle}>{String(t('auth.signInTitle'))}</Text>
              <Text style={styles.formSubtitle}>{String(t('auth.signInSubtitle'))}</Text>
            </View>
            </SlideIn>

              {errorMessage ? (
                <Banner
                  message={errorMessage}
                  variant='error'
                  testID='login-error-banner'
                />
              ) : null}

              <View style={styles.formContainer}>
                <Input
                  testID="email-input"
                  label={String(auth.email())}
                  placeholder={String(auth.email())}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  leftIcon='mail-outline'
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoCorrect={false}
                  accessibilityHint={String(
                    t('auth.emailHint', { defaultValue: 'Please enter your email address to sign in' })
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
                    if (errorMessage) setErrorMessage(null);
                  }}
                  leftIcon='lock-closed-outline'
                  rightIcon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={togglePasswordVisibility}
                  secureTextEntry={!passwordVisible}
                  accessibilityHint={String(
                    t('auth.passwordHint', { defaultValue: 'Please enter your password to sign in' })
                  )}
                  textContentType='password'
                  autoComplete='password'
                  variant='outline'
                  size='lg'
                  fullWidth
                  required
                />

                <TouchableOpacity
                  style={styles.forgotPasswordLink}
                  onPress={() => {
                    haptics.buttonPress();
                    navigation.navigate('ForgotPassword');
                  }}
                  accessibilityRole='button'
                  accessibilityLabel={String(auth.forgotPassword())}
                  accessibilityHint={String(
                    t('auth.forgotPasswordHint', { defaultValue: 'Double tap to reset your password' })
                  )}
                >
                  <Text style={[styles.forgotPasswordText, linkText.textStyle]}>
                    {String(auth.forgotPassword())}
                  </Text>
                </TouchableOpacity>

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
                  style={{ borderRadius: 28, marginTop: 8 }}
                  textStyle={buttonText.textStyle as import('react-native').TextStyle}
                />
              </View>

            <View style={styles.dividerSection}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{String(t('auth.newToMintenance'))}</Text>
              <View style={styles.dividerLine} />
            </View>

              <View style={{ paddingHorizontal: 24 }}>
                <Button
                  variant='secondary'
                  title={String(t('auth.createAccount'))}
                  onPress={() => {
                    haptics.buttonPress();
                    navigation.navigate('Register');
                  }}
                  accessibilityLabel={String(
                    t('auth.signUpForAccount', { defaultValue: 'Sign up for new account' })
                  )}
                  accessibilityHint={String(
                    t('auth.signUpHint', { defaultValue: 'Double tap to create a new account' })
                  )}
                  fullWidth
                  style={{ borderRadius: 28 }}
                />
              </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#134E4A',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: -30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 12,
  },
  headerTitle: {
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: 20,
    paddingBottom: 24,
  },
  formHeading: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 26,
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    paddingVertical: 16,
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontWeight: '600',
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  devSection: {
    marginTop: 16,
    marginHorizontal: 24,
    padding: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
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
