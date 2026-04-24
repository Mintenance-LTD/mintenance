import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as Sentry from '@sentry/react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { logger } from './src/utils/logger';
import { config } from './src/config/environment';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import QueryProvider from './src/providers/QueryProvider';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { ThemeProvider } from './src/design-system/theme';
import { HapticService } from './src/utils/haptics';
import { BackgroundSyncService } from './src/services/BackgroundSyncService';
// Side-effect import: registers the contractor background-location TaskManager
// task at module-load so that Expo can resume delivery after the app relaunches
// from a killed state. See BackgroundLocationTask.ts for details.
import './src/services/BackgroundLocationTask';

// ============================================================================
// SPLASH SCREEN - prevent auto-hide so we control when it dismisses
// ============================================================================
SplashScreen.preventAutoHideAsync().catch(() => {
  // Swallow error if called too late (e.g. in tests)
});

// ============================================================================
// SENTRY - error tracking initialization
// ============================================================================

// Mirrored from packages/shared/src/logger.ts redaction list. Any
// object key matching one of these (case-insensitive) is replaced
// with '[REDACTED]' before the event / breadcrumb is shipped to
// Sentry. Keeps secrets out of third-party observability even if a
// caller accidentally extras them into a breadcrumb payload.
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /bearer/i,
  /jwt/i,
  /api[_-]?key/i,
  /mfa/i,
  /totp/i,
  /^stripe_/i,
  /auth[_-]?tag/i,
  /^iv$/i,
  /credit[_-]?card/i,
  /^cc[_-]?num/i,
  /tax[_-]?id/i,
  /national[_-]?insurance/i,
  /dob|date[_-]?of[_-]?birth/i,
];

const JWT_SHAPE =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const CC_NUMBER_SHAPE = /\b(?:\d[ -]?){13,19}\b/g;

function scrubString(value: string): string {
  return value
    .replace(JWT_SHAPE, '[REDACTED_JWT]')
    .replace(CC_NUMBER_SHAPE, (match) => {
      // CC-number regex overlaps with phone numbers and IDs — only
      // redact when the digit count matches a real card (13–19 digits).
      const digits = match.replace(/[^0-9]/g, '');
      if (digits.length >= 13 && digits.length <= 19) {
        return '[REDACTED_CC]';
      }
      return match;
    });
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERNS.some((re) => re.test(k))) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = scrubValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
  debug: __DEV__,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  integrations: [Sentry.reactNavigationIntegration()],
  beforeSend(event, hint) {
    if (__DEV__ && !process.env.EXPO_PUBLIC_SENTRY_DEBUG) {
      return null;
    }

    const error = hint.originalException;
    if (error && typeof error === 'object') {
      const message = (error as { message?: string }).message || '';
      // Ignore transient network / cancellation errors
      if (
        message.includes('Network request failed') ||
        message.includes('timeout') ||
        message.includes('cancelled') ||
        message.includes('aborted')
      ) {
        return null;
      }
    }

    // Scrub sensitive keys from extras, contexts, request payloads and
    // breadcrumb data before shipping to Sentry. Mirrors the server
    // logger redaction set so mobile doesn't leak anything the web
    // side already hides.
    if (event.extra) {
      event.extra = scrubValue(event.extra) as typeof event.extra;
    }
    if (event.contexts) {
      event.contexts = scrubValue(event.contexts) as typeof event.contexts;
    }
    if (event.request) {
      event.request = scrubValue(event.request) as typeof event.request;
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => ({
        ...b,
        message: b.message ? scrubString(b.message) : b.message,
        data: b.data ? (scrubValue(b.data) as typeof b.data) : b.data,
      }));
    }

    return event;
  },
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
});

// ============================================================================
// APP
// ============================================================================

export default function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initialize = async (): Promise<void> => {
      try {
        logger.info('Mintenance app initializing', { service: 'app' });
        // Load Inter font to match web app branding (falls back to System if unavailable)
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
        }).catch(() => {
          logger.warn('Custom fonts not available, using system fonts', {
            service: 'app',
          });
        });
        await HapticService.initialize();
        // Register background sync for offline queue processing
        await BackgroundSyncService.register();
      } catch (error) {
        logger.error('Initialization error', error, { service: 'app' });
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      // Hide the native splash immediately - our animated one takes over
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Keep native splash screen visible while initializing
  if (!isReady) {
    return <View style={{ flex: 1 }} />;
  }

  const stripePublishableKey = config.stripePublishableKey;
  if (!stripePublishableKey) {
    logger.warn(
      'Stripe publishable key not configured - payment features disabled',
      { service: 'app' }
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ErrorBoundary
          onError={(error, info) => {
            Sentry.captureException(error, {
              contexts: { react: { componentStack: info.componentStack } },
            });
          }}
        >
          <StripeProvider
            publishableKey={stripePublishableKey || 'pk_test_placeholder'}
            merchantIdentifier='merchant.com.mintenance.app'
            urlScheme='mintenance'
          >
            <ThemeProvider>
              <QueryProvider>
                <AuthProvider>
                  <AppNavigator />
                  <StatusBar style='auto' />
                </AuthProvider>
              </QueryProvider>
            </ThemeProvider>
          </StripeProvider>
        </ErrorBoundary>

        {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
      </View>
    </SafeAreaProvider>
  );
}
