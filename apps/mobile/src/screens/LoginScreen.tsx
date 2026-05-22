/**
 * LoginScreen — Mint Editorial v2 redesign (2026-05-22).
 *
 * Implements the mobile sign-in frame from
 * `.design-bundle/.../redesign-v2/auth.html` (MSignIn).
 *
 *   - Back chevron, no chunky gradient header.
 *   - "Welcome back" in the Mint Editorial display face.
 *   - Email + password inputs, Forgot? link aligned right on the
 *     password row.
 *   - Remember email opt-in (P1 from the 2026-04-30 audit, preserved).
 *   - Primary mint Sign in button + footer "New here? Sign up →".
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FadeIn, SlideIn } from '../components/animations/primitives';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';

import { useAccessibleText } from '../hooks/useAccessibleText';
import { useHaptics } from '../utils/haptics';
import { useI18n } from '../hooks/useI18n';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';
import { me } from '../design-system/mint-editorial';
import { useScreenCaptureGuard } from '../hooks/useScreenCaptureGuard';

// 2026-04-30 audit P1: persist ONLY the email used at last successful
// sign-in so returning users don't have to retype it. Password is NEVER
// stored — biometric login + the OS keychain handle that side. Storing
// in AsyncStorage rather than SecureStore is intentional: the email is
// not a secret, but it IS PII so we still gate it behind an explicit
// opt-in checkbox the user can toggle off ("Forget saved email").
const REMEMBER_EMAIL_KEY = '@mintenance:rememberEmail';
const REMEMBER_EMAIL_VALUE = '@mintenance:rememberEmail:value';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
  route?: LoginScreenProps['route'];
}

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  useScreenCaptureGuard();

  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(false);
  const { signIn, loading } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [optInRaw, savedEmail] = await Promise.all([
          AsyncStorage.getItem(REMEMBER_EMAIL_KEY),
          AsyncStorage.getItem(REMEMBER_EMAIL_VALUE),
        ]);
        if (cancelled) return;
        const optIn = optInRaw === 'true';
        setRememberEmail(optIn);
        if (optIn && savedEmail && !route?.params?.email) {
          setEmail(savedEmail);
        }
      } catch {
        /* ignore — Remember-email is non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route?.params?.email]);

  const togglePasswordVisibility = () => setPasswordVisible((prev) => !prev);

  const isDev = __DEV__ || process.env.NODE_ENV === 'development';

  const buttonText = useAccessibleText(15);
  const linkText = useAccessibleText(14);

  const haptics = useHaptics();
  const { t, auth, getErrorMessage } = useI18n();

  const handleLogin = async () => {
    haptics.buttonPress();
    setErrorMessage(null);

    if (!email || !password) {
      haptics.error();
      setErrorMessage(
        String(
          t('auth.fillAllFields', { defaultValue: 'Please fill in all fields' })
        )
      );
      return;
    }

    try {
      haptics.formSubmit();
      await signIn(email, password);
      haptics.loginSuccess();
      try {
        if (rememberEmail) {
          await AsyncStorage.multiSet([
            [REMEMBER_EMAIL_KEY, 'true'],
            [REMEMBER_EMAIL_VALUE, email.trim()],
          ]);
        } else {
          await AsyncStorage.multiRemove([
            REMEMBER_EMAIL_KEY,
            REMEMBER_EMAIL_VALUE,
          ]);
        }
      } catch {
        /* non-critical */
      }
    } catch (error) {
      haptics.loginFailed();
      setErrorMessage(
        String(
          getErrorMessage(
            'loginFailed',
            error instanceof Error ? error.message : String(error)
          )
        )
      );
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style='dark' />
      <View style={styles.container} testID='login-screen'>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            <FadeIn duration={400}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  accessibilityRole='button'
                  accessibilityLabel='Go back'
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name='chevron-back' size={20} color={me.ink2} />
                  <Text style={styles.backLabel}>Back</Text>
                </TouchableOpacity>
                <View style={styles.brandMark}>
                  <Ionicons name='leaf' size={16} color={me.onBrand} />
                </View>
              </View>
            </FadeIn>

            <SlideIn direction='up' distance={20} duration={400} delay={120}>
              <View style={styles.formHeading}>
                <Text style={styles.formTitle} accessibilityRole='header'>
                  Welcome back
                </Text>
                <Text style={styles.formSubtitle}>
                  Sign in to manage jobs, bids and properties.
                </Text>
              </View>
            </SlideIn>

            {errorMessage ? (
              <View style={styles.bannerWrap}>
                <Banner
                  mint
                  message={errorMessage}
                  variant='error'
                  testID='login-error-banner'
                />
              </View>
            ) : null}

            <View style={styles.formContainer}>
              <Input
                mint
                testID='email-input'
                label={String(auth.email())}
                placeholder='you@home.uk'
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
                  t('auth.emailHint', {
                    defaultValue: 'Please enter your email address to sign in',
                  })
                )}
                textContentType='emailAddress'
                autoComplete='email'
                variant='outline'
                size='lg'
                fullWidth
                required
                containerStyle={{ marginBottom: 12 }}
              />

              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>{String(auth.password())}</Text>
                <TouchableOpacity
                  style={styles.forgotPasswordLink}
                  onPress={() => {
                    haptics.buttonPress();
                    navigation.navigate('ForgotPassword');
                  }}
                  accessibilityRole='button'
                  accessibilityLabel={String(auth.forgotPassword())}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.forgotPasswordText, linkText.textStyle]}>
                    Forgot?
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                mint
                testID='password-input'
                placeholder='••••••••'
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
                  t('auth.passwordHint', {
                    defaultValue: 'Please enter your password to sign in',
                  })
                )}
                textContentType='password'
                autoComplete='password'
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <TouchableOpacity
                style={styles.rememberToggle}
                onPress={() => {
                  haptics.selection();
                  setRememberEmail((prev) => !prev);
                }}
                accessibilityRole='checkbox'
                accessibilityState={{ checked: rememberEmail }}
                accessibilityLabel='Remember email'
                accessibilityHint='When enabled, your email address is saved for next time. Your password is never saved.'
                testID='remember-email-toggle'
              >
                <View
                  style={[
                    styles.rememberCheckbox,
                    rememberEmail && styles.rememberCheckboxChecked,
                  ]}
                >
                  {rememberEmail ? (
                    <Ionicons name='checkmark' size={14} color={me.onBrand} />
                  ) : null}
                </View>
                <Text style={styles.rememberLabel}>Keep me signed in</Text>
              </TouchableOpacity>

              <Button
                mint
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
                style={{ marginTop: 16 }}
                textStyle={
                  buttonText.textStyle as import('react-native').TextStyle
                }
              />
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerLabel}>New here?</Text>
              <TouchableOpacity
                onPress={() => {
                  haptics.buttonPress();
                  navigation.navigate('Register');
                }}
                accessibilityRole='button'
                accessibilityLabel={String(t('auth.createAccount'))}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.footerLink}>Sign up →</Text>
              </TouchableOpacity>
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backLabel: {
    fontSize: 14,
    color: me.ink2,
    fontWeight: '500',
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeading: {
    marginBottom: 22,
  },
  formTitle: {
    fontFamily: me.font.display,
    fontSize: 36,
    lineHeight: 40,
    color: me.ink,
    marginBottom: 4,
    letterSpacing: me.displayTracking,
  },
  formSubtitle: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
  },
  bannerWrap: {
    marginBottom: 12,
  },
  formContainer: {
    backgroundColor: 'transparent',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
  },
  forgotPasswordLink: {
    paddingVertical: 2,
  },
  forgotPasswordText: {
    color: me.brand,
    fontWeight: '600',
    fontSize: 12,
  },
  rememberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  rememberCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: me.line,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rememberCheckboxChecked: {
    backgroundColor: me.brand,
    borderColor: me.brand,
  },
  rememberLabel: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  footerLabel: {
    fontSize: 13,
    color: me.ink2,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: me.brand,
  },
  devSection: {
    marginTop: 24,
    padding: 12,
    backgroundColor: me.bg2,
    borderRadius: me.radius.card,
    borderWidth: 1,
    borderColor: me.line,
    borderStyle: 'dashed',
  },
  devTitle: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    marginBottom: 4,
  },
  devNote: {
    textAlign: 'center',
    fontSize: 11,
    color: me.ink3,
  },
});

export default LoginScreen;
