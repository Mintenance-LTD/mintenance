import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthService } from '../services/AuthService';
import { AuthStackParamList } from '../navigation/types';
import { logger } from '../utils/logger';
import { theme } from '../theme';
import { useScreenCaptureGuard } from '../hooks/useScreenCaptureGuard';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  // SECURITY: prevent screenshots / screen recording on password-reset
  // flows so reset codes / links aren't captured by third-party apps.
  useScreenCaptureGuard();

  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (success && resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [success]);

  const handleResend = useCallback(async () => {
    setResendTimer(30);
    await handleResetPassword();
  }, [email]);

  const clearError = useCallback(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [errorMessage]);

  const validateForm = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setErrorMessage(null);
    setSuccess(false);
    setLoading(true);
    try {
      await AuthService.resetPassword(email);
      setSuccess(true);
      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Password reset failed', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to send reset email. Please check your email address and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
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
          </View>

          <View style={styles.successContainer}>
            <View style={styles.successIconWrap}>
              <Ionicons
                name='checkmark-circle'
                size={48}
                color={theme.colors.primary}
                accessible={false}
              />
            </View>
            <Text style={styles.successTitle} accessibilityRole='header'>
              Email Sent!
            </Text>
            <Text style={styles.successMessage}>
              We've sent a password reset link to{' '}
              <Text style={styles.emailHighlight}>{email}</Text>. Please check
              your email and follow the instructions.
            </Text>

            {resendTimer > 0 ? (
              <Text
                style={styles.resendTimerText}
                accessibilityLabel={`Resend available in ${resendTimer} seconds`}
              >
                Resend in {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={loading}
                accessibilityRole='button'
                accessibilityLabel='Resend password reset email'
                accessibilityHint='Double tap to resend the password reset email'
              >
                <Text style={styles.resendLinkText}>
                  {loading ? 'Sending...' : "Didn't receive it? Resend"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityRole='button'
              accessibilityLabel='Back to login'
              accessibilityHint='Double tap to return to the login screen'
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            accessibilityHint='Return to login screen'
          >
            <Ionicons
              name='arrow-back'
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerLogo}
              resizeMode='contain'
              accessible={false}
            />
            <Text style={styles.headerTitle} accessibilityRole='header'>
              Reset Password
            </Text>
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
            {errorMessage ? (
              <Banner
                message={errorMessage}
                variant='error'
                testID='reset-error-banner'
              />
            ) : null}
            <View style={styles.formContainer}>
              <View style={styles.instructionContainer}>
                <View style={styles.mailIconWrap}>
                  <Ionicons
                    name='mail'
                    size={28}
                    color='#3B82F6'
                    accessible={false}
                  />
                </View>
                <Text
                  style={styles.instructionTitle}
                  accessibilityRole='header'
                >
                  Forgot your password?
                </Text>
                <Text style={styles.instructionText}>
                  Enter your email address and we'll send you a link to reset
                  your password.
                </Text>
              </View>

              <Input
                label='Email Address'
                placeholder='Email Address'
                value={email}
                onChangeText={(value) => {
                  clearError();
                  setEmail(value);
                }}
                leftIcon='mail-outline'
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                accessibilityHint='Enter your email address to receive a password reset link'
                textContentType='emailAddress'
                autoComplete='email'
                autoFocus
                variant='outline'
                size='lg'
                fullWidth
                required
              />

              <Button
                variant='primary'
                title={loading ? 'Sending...' : 'Send Reset Link'}
                onPress={handleResetPassword}
                disabled={loading}
                loading={loading}
                accessibilityLabel={
                  loading ? 'Sending reset email' : 'Send reset email'
                }
                fullWidth
                style={{ borderRadius: 28, marginBottom: 24 }}
              />

              <TouchableOpacity
                style={styles.backLinkButton}
                onPress={() => navigation.goBack()}
                accessibilityRole='button'
                accessibilityLabel='Back to login'
                accessibilityHint='Return to login screen'
              >
                <Text style={styles.backLinkText}>Back to Login</Text>
              </TouchableOpacity>
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
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backIconButton: {
    position: 'absolute',
    left: 24,
    top: 60,
    padding: 8,
    zIndex: 1,
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
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mailIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  instructionText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  backLinkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backLinkText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  successMessage: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emailHighlight: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  resendTimerText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  resendLinkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
