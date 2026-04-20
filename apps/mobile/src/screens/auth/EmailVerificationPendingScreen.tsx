/**
 * EmailVerificationPendingScreen — Phase 1.2 (Branch B) of the
 * mobile onboarding audit remediation.
 *
 * Why this screen exists
 * -----------------------
 * Supabase email-confirm is ON in prod (verified 2026-04-19 via MCP:
 * real users have 27s–1h time_to_confirm). That means `signUp()`
 * does NOT return a session — it just sends a confirmation email
 * and the user has to click the link before any sign-in works.
 *
 * Before this screen, the register flow ended with a toast
 * "Account created! You can now sign in." on the register screen.
 * Users were stuck — they couldn't sign in (unconfirmed), they
 * didn't know about the email, and there was no way to resend.
 *
 * Now, on signUp success RegisterScreen navigates here with the
 * email address. We:
 *   1. Explain exactly what just happened and where to look.
 *   2. Deep-link to the mail app (`message:` on iOS, `mailto:` on
 *      Android — both open the default mail client).
 *   3. Resend the confirmation email with a 60-second cooldown.
 *   4. Send the user to Login with the email pre-filled when they
 *      say "I've confirmed". We deliberately do NOT auto-sign-in:
 *      caching the plaintext password in nav params or in-memory
 *      is a leak risk (React Navigation serializes state for deep
 *      links), and the email-confirm flow happens in an external
 *      browser so we don't have fresh session tokens to reuse.
 *   5. Let them bounce back to Register to retype a different
 *      email (common typo-recovery path).
 *
 * Non-forced: user can dismiss at any time via the back arrow.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { AuthService } from '../../services/AuthService';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'EmailVerificationPending'
>;

const RESEND_COOLDOWN_SECONDS = 60;

export const EmailVerificationPendingScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { email } = route.params;

  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown tick for the resend cooldown.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    intervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resendCooldown]);

  const handleOpenMailApp = useCallback(async () => {
    // iOS: message: scheme opens Apple Mail directly.
    // Android: the generic mailto: intent opens whatever mail client
    // the user has registered as default. Neither is guaranteed;
    // fall back to the app chooser if the deep-link fails.
    const scheme = Platform.OS === 'ios' ? 'message:' : 'mailto:';
    try {
      const canOpen = await Linking.canOpenURL(scheme);
      if (canOpen) {
        await Linking.openURL(scheme);
        return;
      }
      // Fallback: open a blank draft; at minimum this surfaces the
      // mail app chooser so the user can get to their inbox.
      await Linking.openURL('mailto:');
    } catch (err) {
      logger.warn('EmailVerificationPending: failed to open mail app', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError(
        'Could not open your mail app automatically. Please open it manually.'
      );
    }
  }, []);

  const handleResend = useCallback(async () => {
    if (resending || resendCooldown > 0) return;
    setError(null);
    setSuccess(null);
    setResending(true);
    try {
      await AuthService.resendSignupConfirmation(email);
      setSuccess('Confirmation email resent — please check your inbox.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to resend email';
      // Supabase's built-in rate-limiter returns a readable message;
      // surface it verbatim so the user knows to wait.
      setError(message);
      logger.warn('EmailVerificationPending: resend failed', {
        error: message,
      });
    } finally {
      setResending(false);
    }
  }, [email, resending, resendCooldown]);

  const handleGoToLogin = useCallback(() => {
    // Pre-fill email so the user re-types only the password.
    // Using `replace` instead of `navigate` so the back button
    // doesn't land them back on the pending screen.
    navigation.replace('Login', { email });
  }, [email, navigation]);

  const handleUseDifferentEmail = useCallback(() => {
    navigation.replace('Register');
  }, [navigation]);

  const resendLabel =
    resendCooldown > 0
      ? `Resend in ${resendCooldown}s`
      : resending
        ? 'Sending…'
        : 'Resend Email';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps='handled'
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name='mail-unread' size={56} color={theme.colors.primary} />
        </View>

        <Text style={styles.title} accessibilityRole='header'>
          Check your email
        </Text>
        <Text style={styles.subtitle}>We sent a verification link to</Text>
        <Text style={styles.emailText} numberOfLines={1} ellipsizeMode='middle'>
          {email}
        </Text>

        <Text style={styles.instruction}>
          Tap the link in that email to confirm your account, then come back
          here to sign in.
        </Text>

        {error && (
          <View style={styles.banner}>
            <Banner variant='error' message={error} />
          </View>
        )}
        {success && (
          <View style={styles.banner}>
            <Banner variant='success' message={success} />
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title='Open Mail App'
            onPress={handleOpenMailApp}
            variant='primary'
            fullWidth
            accessibilityLabel='Open mail app'
            style={styles.primaryAction}
          />

          <Button
            title="I've Confirmed My Email"
            onPress={handleGoToLogin}
            variant='outline'
            fullWidth
            accessibilityLabel='I have confirmed my email, continue to sign in'
            style={styles.secondaryAction}
          />

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || resendCooldown > 0}
            style={styles.resendRow}
            accessibilityRole='button'
            accessibilityLabel={
              resendCooldown > 0
                ? `Resend available in ${resendCooldown} seconds`
                : 'Resend confirmation email'
            }
            accessibilityState={{ disabled: resending || resendCooldown > 0 }}
          >
            <Text style={styles.resendHint}>Didn&apos;t get the email?</Text>
            <Text
              style={[
                styles.resendLink,
                (resending || resendCooldown > 0) && styles.resendLinkDisabled,
              ]}
            >
              {resendLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleUseDifferentEmail}
          style={styles.footerLinkWrap}
          accessibilityRole='button'
          accessibilityLabel='Use a different email address'
        >
          <Text style={styles.footerLink}>Use a different email address</Text>
        </TouchableOpacity>

        <Text style={styles.helpText}>
          Tip: check your spam folder if you don&apos;t see the email within a
          minute.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EmailVerificationPendingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  instruction: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  banner: {
    marginBottom: 16,
  },
  actions: {
    marginTop: 8,
  },
  primaryAction: {
    marginBottom: 12,
  },
  secondaryAction: {
    marginBottom: 16,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  resendHint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  resendLinkDisabled: {
    color: theme.colors.textTertiary,
  },
  footerLinkWrap: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 24,
  },
});
