import React, { useEffect, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { StatusBar } from 'expo-status-bar';
import { LandingScreen } from './src/screens/LandingScreen';

// Production systems imports
import {
  initializeProductionSystems,
  errorTracking,
  performanceTracking,
  systemMonitoring
} from './src/utils/productionSetupGuide';
import { logger } from './src/utils/logger';

// Debug logging - fixed import issue
console.log('🚀 App.tsx loaded with production systems...');
console.log('📱 Platform:', Platform.OS);
console.log('🌐 User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');

// Global error boundary component
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 App Error Boundary caught error:', error);

    // Track the error with production systems
    errorTracking.trackError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      context: 'app_level_error'
    });

    logger.error('App', 'Critical app error caught by boundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
              🚨 Application Error
            </Text>
            <Text style={{ fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
              Something went wrong. The error has been logged for investigation.
            </Text>
            <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
              Error: {this.state.error?.message}
            </Text>
          </View>
          {/* <StatusBar style="auto" /> */}
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isProductionReady, setIsProductionReady] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🔧 Initializing production systems...');

      try {
        // Record app startup start time
        const startTime = Date.now();

        // Initialize all production systems
        await initializeProductionSystems();

        // Record successful startup
        const initTime = Date.now() - startTime;
        performanceTracking.trackCustomMetric('app_initialization_time', initTime);

        // Track successful app launch
        errorTracking.trackUserAction('app_launched', {
          platform: Platform.OS,
          initializationTime: initTime,
          timestamp: Date.now()
        });

        // Check system readiness
        const readinessStatus = systemMonitoring.getReadinessStatus();
        if (readinessStatus) {
          logger.info('App', 'Production systems initialized successfully', {
            overallStatus: readinessStatus.overall,
            score: readinessStatus.score,
            initializationTime: initTime
          });
        }

        setIsProductionReady(true);
        console.log('✅ Production systems ready! Overall score:', readinessStatus?.score || 'Unknown');

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        console.error('❌ Failed to initialize production systems:', errorMessage);

        setInitializationError(errorMessage);

        // Track initialization failure
        errorTracking.trackError(error as Error, {
          context: 'app_initialization_failure',
          critical: true
        });

        logger.error('App', 'Production systems initialization failed', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });

        // Continue with app launch even if monitoring fails
        setIsProductionReady(true);
      }
    };

    initializeApp();

    // Track memory usage periodically
    const memoryInterval = setInterval(() => {
      performanceTracking.trackMemory();
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(memoryInterval);
    };
  }, []);

  // Show loading state during initialization
  if (!isProductionReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>🔧 Initializing Mintenance...</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>Setting up production systems</Text>
        </View>
        {/* <StatusBar style="auto" /> */}
      </SafeAreaProvider>
    );
  }

  console.log('🔍 App component rendering with production systems ready');

  // Show warning if initialization had issues but continue
  if (initializationError) {
    console.warn('⚠️ App running with limited monitoring due to initialization error:', initializationError);
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <LandingScreen />
        {/* <StatusBar style="auto" /> */}
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}