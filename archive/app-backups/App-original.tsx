import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

// Import components safely
let AuthProvider: React.ComponentType<any> | undefined;
let AppNavigator: React.ComponentType<any> | undefined;
let ErrorBoundary:
  | React.ComponentType<{
      children: React.ReactNode;
      fallback?: (error: Error, resetError: () => void) => React.ReactNode;
      onError?: (error: Error, errorInfo: any) => void;
    }>
  | undefined;
let QueryProvider:
  | React.ComponentType<{ children: React.ReactNode }>
  | undefined;
let componentsLoaded = false;

try {
  AuthProvider = require('./src/contexts/AuthContext').AuthProvider;
  AppNavigator = require('./src/navigation/AppNavigator').default;
  ErrorBoundary = require('./src/components/ErrorBoundary').default;
  QueryProvider = require('./src/providers/QueryProvider').default;
  componentsLoaded = true;
} catch (error) {
  console.error('Failed to import components:', error);
  componentsLoaded = false;
}

// Fallback component if imports fail
const FallbackApp = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}
  >
    <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
      Mintenance
    </Text>
    <Text style={{ textAlign: 'center', color: 'red' }}>
      App is starting up... If this message persists, please restart the app.
    </Text>
  </View>
);

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize core systems safely with a delay
    const initializeApp = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Give everything time to load

        console.log('Mintenance app starting...');

        // Initialize error tracking system (Step 1/3 re-enablement)
        try {
          const {
            initializeErrorTracking,
          } = require('./src/utils/errorTracking');
          initializeErrorTracking();
          console.log('✅ Error tracking initialized successfully');
        } catch (errorTrackingError: any) {
          console.warn(
            '⚠️ Error tracking initialization failed:',
            errorTrackingError?.message || errorTrackingError
          );
        }

        // Initialize performance budgets system (Step 2/3 re-enablement)
        try {
          const {
            PerformanceBudgetManager,
          } = require('./src/utils/performanceBudgets');
          PerformanceBudgetManager.initialize();
          console.log('✅ Performance budgets initialized successfully');
        } catch (performanceError: any) {
          console.warn(
            '⚠️ Performance budgets initialization failed:',
            performanceError?.message || performanceError
          );
        }

        // Initialize circuit breakers system (Step 3/3 re-enablement)
        try {
          const {
            circuitBreakerManager,
          } = require('./src/utils/circuitBreaker');
          // Circuit breakers are initialized on first use, just verify availability
          console.log(
            '✅ Circuit breakers available:',
            circuitBreakerManager ? 'Yes' : 'No'
          );
        } catch (circuitError: any) {
          console.warn(
            '⚠️ Circuit breakers initialization failed:',
            circuitError?.message || circuitError
          );
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsInitialized(true); // Still try to render
      }
    };

    initializeApp();
  }, []);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontSize: 24, marginBottom: 20 }}>Mintenance</Text>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Return fallback if components failed to load
  if (
    !componentsLoaded ||
    !AuthProvider ||
    !AppNavigator ||
    !ErrorBoundary ||
    !QueryProvider
  ) {
    return <FallbackApp />;
  }

  const AuthProviderComponent = AuthProvider;
  const AppNavigatorComponent = AppNavigator;
  const ErrorBoundaryComponent = ErrorBoundary;
  const QueryProviderComponent = QueryProvider;

  return (
    <ErrorBoundaryComponent>
      <QueryProviderComponent>
        <AuthProviderComponent>
          <AppNavigatorComponent />
          <StatusBar style='auto' />
        </AuthProviderComponent>
      </QueryProviderComponent>
    </ErrorBoundaryComponent>
  );
}
