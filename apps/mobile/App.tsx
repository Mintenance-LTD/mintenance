import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { logger } from './src/utils/logger';
import { config } from './src/config/environment';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import QueryProvider from './src/providers/QueryProvider';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { ThemeProvider } from './src/design-system/theme';
import { HapticService } from './src/utils/haptics';

// ============================================================================
// SPLASH SCREEN - prevent auto-hide so we control when it dismisses
// ============================================================================
SplashScreen.preventAutoHideAsync().catch(() => {
  // Swallow error if called too late (e.g. in tests)
});

// ============================================================================
// SENTRY - error tracking initialization
// ============================================================================
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
  debug: __DEV__,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  integrations: [
    Sentry.reactNativeTracingIntegration({
      routingInstrumentation: Sentry.reactNavigationIntegration(),
    }),
  ],
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
        await HapticService.initialize();
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
      { service: 'app' },
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
            merchantIdentifier="merchant.com.mintenance.app"
            urlScheme="mintenance"
          >
            <ThemeProvider>
              <QueryProvider>
                <AuthProvider>
                  <AppNavigator />
                  <StatusBar style="auto" />
                </AuthProvider>
              </QueryProvider>
            </ThemeProvider>
          </StripeProvider>
        </ErrorBoundary>

        {showSplash && (
          <AnimatedSplash onFinish={() => setShowSplash(false)} />
        )}
      </View>
    </SafeAreaProvider>
  );
}
