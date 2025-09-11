import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Simple loading screen
const LoadingScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Mintenance</Text>
    <Text style={styles.subtitle}>Contractor Discovery Marketplace</Text>
    <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
    <Text style={styles.loadingText}>Initializing...</Text>
  </View>
);

// Fallback screen when components fail to load
const FallbackScreen = ({ error }: { error?: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>Mintenance</Text>
    <Text style={styles.subtitle}>Contractor Discovery Marketplace</Text>
    <Text style={styles.message}>Welcome! The app is starting up in safe mode.</Text>
    {error && <Text style={styles.error}>Debug: {error}</Text>}
    <Text style={styles.features}>
      {"- Connect with contractors\n- Post home improvement jobs\n- Real-time messaging\n- Secure payments"}
    </Text>
  </View>
);

// Main App Component
export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [components, setComponents] = useState<any>({});
  const [error, setError] = useState<string>('');
  const [GestureHandlerRootView, setGestureHandlerRootView] = useState<any>(null);

  useEffect(() => {
    initializeApp();
    setupDeepLinking();
  }, []);

  const setupDeepLinking = async () => {
    // Simplified deep linking to avoid crashes
    try {
      const Linking = await import('expo-linking');
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Deep link received:', initialUrl);
      }
    } catch (error) {
      console.log('Deep linking not available:', error);
    }
  };

  const initializeApp = async () => {
    try {
      console.log('Starting Mintenance app...');
      
      // Initialize Sentry first thing after React Native is ready
      try {
        const { initSentry } = await import('./src/config/sentry');
        initSentry();
        console.log('Sentry initialized successfully');
      } catch (sentryError) {
        console.warn('Sentry initialization failed:', sentryError);
      }

      // Load gesture handler after React Native is ready
      try {
        const { GestureHandlerRootView: GestureHandler } = await import('react-native-gesture-handler');
        setGestureHandlerRootView(() => GestureHandler);
        console.log('GestureHandlerRootView loaded');
      } catch (gestureError) {
        console.warn('GestureHandlerRootView failed to load:', gestureError);
        // Use a simple View as fallback
        setGestureHandlerRootView(() => View);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const loadedComponents: any = {};
      let hasAllComponents = true;

      // Try to load core components
      try {
        const { AuthProvider } = await import('./src/contexts/AuthContext');
        loadedComponents.AuthProvider = AuthProvider;
        console.log('AuthProvider loaded');
      } catch (e: any) {
        console.warn('AuthProvider failed, using fallback');
        try {
          const { AuthProvider } = await import('./src/contexts/AuthContext-fallback');
          loadedComponents.AuthProvider = AuthProvider;
        } catch (fallbackError) {
          console.error('AuthProvider fallback failed');
          hasAllComponents = false;
        }
      }

      try {
        const AppNavigator = (await import('./src/navigation/AppNavigator')).default;
        loadedComponents.AppNavigator = AppNavigator;
        console.log('AppNavigator loaded');
      } catch (e) {
        console.warn('AppNavigator failed, using fallback');
        try {
          const AppNavigator = (await import('./src/navigation/AppNavigator-fallback')).default;
          loadedComponents.AppNavigator = AppNavigator;
        } catch (fallbackError) {
          console.error('AppNavigator fallback failed');
          hasAllComponents = false;
        }
      }

      // Optional components (won't fail startup if missing)
      try {
        const ErrorBoundary = (await import('./src/components/ErrorBoundary')).default;
        loadedComponents.ErrorBoundary = ErrorBoundary;
      } catch (e) {
        console.log('ErrorBoundary not available, using built-in');
      }

      try {
        const QueryProvider = (await import('./src/providers/QueryProvider')).default;
        loadedComponents.QueryProvider = QueryProvider;
      } catch (e) {
        console.log('QueryProvider not available, using basic setup');
      }

      // Stripe provider (optional)
      try {
        const StripeProvider = (await import('./src/providers/StripeProvider')).default;
        loadedComponents.StripeProvider = StripeProvider;
      } catch (e) {
        console.log('StripeProvider not available or not configured');
      }

      setComponents(loadedComponents);
      setAppReady(hasAllComponents);

      if (hasAllComponents) {
        console.log('App initialization completed successfully');
      } else {
        setError('Some components failed to load');
        console.log('App initialized in fallback mode');
      }
    } catch (error: any) {
      console.error('App initialization failed:', error);
      setError(error.message || 'Initialization failed');
      setAppReady(false);
    }
  };

  if (!appReady && !error) {
    return (
      <>
        <LoadingScreen />
        <StatusBar style="auto" />
      </>
    );
  }

  if (!components.AuthProvider || !components.AppNavigator || !GestureHandlerRootView) {
    return (
      <>
        <FallbackScreen error={error} />
        <StatusBar style="auto" />
      </>
    );
  }

  const { AuthProvider, AppNavigator, ErrorBoundary, QueryProvider, StripeProvider } = components;
  const AppContent = () => <AppNavigator />;

  const AppWithProviders = () => {
    // Build provider tree dynamically based on availability
    let tree = (
      <>
        <AppContent />
        <StatusBar style="auto" />
      </>
    );

    if (QueryProvider) tree = (<QueryProvider>{tree}</QueryProvider>);
    if (StripeProvider) tree = (<StripeProvider>{tree}</StripeProvider>);
    if (AuthProvider) tree = (<AuthProvider>{tree}</AuthProvider>);
    if (ErrorBoundary) tree = (<ErrorBoundary>{tree}</ErrorBoundary>);

    return tree;
  };

  const RootWrapper = GestureHandlerRootView || View;
  
  return (
    <RootWrapper style={{ flex: 1 }}>
      <AppWithProviders />
    </RootWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 30,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#4B5563',
    marginTop: 10,
  },
  message: {
    fontSize: 18,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  error: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  features: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'left',
    lineHeight: 24,
    backgroundColor: '#F1F5F9',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
  },
});
