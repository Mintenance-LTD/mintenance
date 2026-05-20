import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FadeIn, SlideIn } from '../components/animations/primitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// Phase 1.2 — EmailVerificationPendingScreen may hand off a `{ email }`
// param so the user doesn't re-type their address. All other entries
// (deep links, tab resets, etc.) pass no params.
type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
  route?: LoginScreenProps['route'];
}

const TRUST_ITEMS = [
  { icon: 'shield-checkmark-outline' as const, label: 'Secure' },
  { icon: 'checkmark-circle-outline' as const, label: 'Verified' },
  { icon: 'people-outline' as const, label: 'Trusted' },
];

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  // SECURITY: prevent screenshots / screen recording while the password
  // field is on-screen. See apps/mobile/src/hooks/useScreenCaptureGuard.ts.
  useScreenCaptureGuard();

  const insets = useSafeAreaInsets();
  // Pre-fill email when redirected from EmailVerificationPendingScreen.
  // Falls back to '' for every other entry; the "Remember email" effect
  // below may then fill it from AsyncStorage if the user opted in.
  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(false);
  const { signIn, loading } = useAuth();

  // Load the remembered email + opt-in flag on mount. Best-effort —
  // if AsyncStorage throws we just leave the form empty.
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
      // Persist (or clear) the remembered email AFTER a confirmed
      // successful sign-in so a typo or wrong account never gets saved.
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

  return (
    <View style={styles.safeArea}>
      <StatusBar style='light' />
      <View style={styles.container} testID='login-screen'>
        <FadeIn duration={500}>
          <LinearGradient
            colors={[me.brand2, me.brand]}
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
                  <Ionicons
                    name={item.icon}
                    size={13}
                    color='rgba(255,255,255,0.9)'
                  />
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
            <SlideIn direction='up' distance={20} duration={400} delay={200}>
              <View style={styles.formHeading}>
                <Text style={styles.formSectionLabel}>ACCOUNT ACCESS</Text>
                <Text style={styles.formTitle}>
                  {String(t('auth.signInTitle'))}
                </Text>
                <Text style={styles.formSubtitle}>
                  {String(t('auth.signInSubtitle'))}
                </Text>
              </View>
            </SlideIn>

            {errorMessage ? (
              <Banner
                mint
                message={errorMessage}
                variant='error'
                testID='login-error-banner'
              />
            ) : null}

            <View style={styles.formContainer}>
              <Input
                mint
                testID='email-input'
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
                containerStyle={{ marginBottom: 16 }}
              />

              <Input
                mint
                testID='password-input'
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

              {/* Remember email row + Forgot password link.
                  2026-04-30 audit P1: explicit opt-in toggle. Saves only
                  the email (never the password). Toggling off + signing
                  in clears any previously saved value. */}
              <View style={styles.rememberRow}>
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
                  <Text style={styles.rememberLabel}>Remember email</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotPasswordLink}
                  onPress={() => {
                    haptics.buttonPress();
                    navigation.navigate('ForgotPassword');
                  }}
                  accessibilityRole='button'
                  accessibilityLabel={String(auth.forgotPassword())}
                  accessibilityHint={String(
                    t('auth.forgotPasswordHint', {
                      defaultValue: 'Double tap to reset your password',
                    })
                  )}
                >
                  <Text style={[styles.forgotPasswordText, linkText.textStyle]}>
                    {String(auth.forgotPassword())}
                  </Text>
                </TouchableOpacity>
              </View>

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
                style={{ marginTop: 8 }}
                textStyle={
                  buttonText.textStyle as import('react-native').TextStyle
                }
              />
            </View>

            <View style={styles.dividerSection}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {String(t('auth.newToMintenance'))}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={{ paddingHorizontal: 24 }}>
              <Button
                mint
                variant='secondary'
                title={String(t('auth.createAccount'))}
                onPress={() => {
                  haptics.buttonPress();
                  navigation.navigate('Register');
                }}
                accessibilityLabel={String(
                  t('auth.signUpForAccount', {
                    defaultValue: 'Sign up for new account',
                  })
                )}
                accessibilityHint={String(
                  t('auth.signUpHint', {
                    defaultValue: 'Double tap to create a new account',
                  })
                )}
                fullWidth
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
    backgroundColor: me.brand2,
  },
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  header: {
    paddingBottom: 32,
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
    fontFamily: me.font.display,
    color: me.onBrand,
    letterSpacing: me.displayTracking,
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
    backgroundColor: me.bg,
    paddingTop: 20,
    paddingBottom: 24,
  },
  formHeading: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  formTitle: {
    fontFamily: me.font.display,
    fontSize: 30,
    color: me.ink,
    marginBottom: 4,
    letterSpacing: me.displayTracking,
  },
  formSubtitle: {
    fontSize: 15,
    color: me.ink2,
  },
  formContainer: {
    paddingHorizontal: 24,
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    marginHorizontal: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: me.line,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  rememberToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rememberCheckbox: {
    width: 22,
    height: 22,
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
    fontSize: 14,
    color: me.ink2,
    fontWeight: '500',
  },
  forgotPasswordLink: {
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: me.brand,
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
    backgroundColor: me.line,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: me.ink3,
    fontWeight: '500',
  },
  devSection: {
    marginTop: 16,
    marginHorizontal: 24,
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
