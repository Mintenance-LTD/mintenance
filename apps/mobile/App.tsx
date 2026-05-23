import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Text, View } from 'react-native';
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
import { NotificationService } from './src/services/NotificationService';
import { runStorageMigrations } from './src/config/storageMigrations';
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

        // Audit P2 (2026-05-10): run AsyncStorage migrations BEFORE any
        // consumer reads a possibly-migrated key (QueryProvider hydration,
        // auth-session restore, theme load, etc.). The function is a
        // no-op when already at latest, so it's safe on every cold start.
        await runStorageMigrations().catch((err: unknown) => {
          logger.warn(
            'Storage migrations failed; continuing with current schema',
            {
              service: 'app',
              error: err instanceof Error ? err.message : String(err),
            }
          );
        });

        // Mint Editorial typography (2026-05-23 restore — the 2026-05-21
        // "unify on Inter" change accidentally swapped the editorial serif
        // for Inter-Black, which is what made the APK look like the legacy
        // UI even after the layout redesign. Restoring the original spec
        // from .design-bundle/redesign-v2/themes.css:
        //   --font-display: "Instrument Serif", serif (weight 400)
        //   --font-body:    "Geist", sans-serif (weight 400)
        //   --font-ui:      "Geist", sans-serif
        // Inter weights stay bundled so any screen that explicitly opts
        // into Inter-* still renders. `me.font.display` now resolves to
        // `InstrumentSerif_400Regular` — every Mint Editorial v2 surface
        // that uses the token transforms automatically.
        const [
          { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic },
          {
            Geist_400Regular,
            Geist_500Medium,
            Geist_600SemiBold,
            Geist_700Bold,
          },
        ] = await Promise.all([
          import('@expo-google-fonts/instrument-serif'),
          import('@expo-google-fonts/geist'),
        ]);
        await Font.loadAsync({
          // Editorial serif (display) + italic for pull quotes / accents.
          InstrumentSerif_400Regular,
          InstrumentSerif_400Regular_Italic,
          // Geist (body / UI).
          Geist_400Regular,
          Geist_500Medium,
          Geist_600SemiBold,
          Geist_700Bold,
          // Inter retained for explicit per-screen opt-ins (numbers, etc.)
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
          'Inter-ExtraBold': require('./assets/fonts/Inter-ExtraBold.ttf'),
          'Inter-Black': require('./assets/fonts/Inter-Black.ttf'),
        }).catch(() => {
          logger.warn('Custom fonts not available, using system fonts', {
            service: 'app',
          });
        });
        await HapticService.initialize();
        // Register background sync for offline queue processing
        await BackgroundSyncService.register();
        // 2026-04-30 audit P0-10: refresh app icon badge on cold start
        // so it reflects whatever notifications were read on web while
        // the app was closed. Best-effort — never blocks app boot.
        NotificationService.refreshBadgeFromServer().catch(() => {});
      } catch (error) {
        logger.error('Initialization error', error, { service: 'app' });
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  // 2026-04-30 audit P0-10: keep the launcher badge in sync with the
  // server's unread count whenever the app comes back to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        NotificationService.refreshBadgeFromServer().catch(() => {});
      }
    });
    return () => sub.remove();
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

  // 2026-05-02 audit follow-up (98% readiness step 6): the previous
  // `stripePublishableKey || 'pk_test_placeholder'` fallback meant a
  // production build with a missing env var would silently ship with a
  // fake Stripe key — payments would fail at runtime in confusing ways
  // (Stripe SDK accepts the format, then 401s on charge). Now we hard
  // fail in production builds, and only fall back to the test
  // placeholder in dev so local boots still work without a key.
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

  if (!isDev && !stripePublishableKey) {
    throw new Error(
      'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is required for production builds'
    );
  }

  if (!stripePublishableKey) {
    logger.warn(
      'Stripe publishable key not configured - payment features disabled',
      { service: 'app' }
    );
  }

  const safeStripePublishableKey =
    stripePublishableKey || (isDev ? 'pk_test_placeholder' : '');

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
            publishableKey={safeStripePublishableKey}
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
