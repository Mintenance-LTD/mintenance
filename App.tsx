import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

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
    <Text style={styles.message}>
      Welcome! The app is starting up in safe mode.
    </Text>
    {error && (
      <Text style={styles.error}>
        Debug: {error}
      </Text>
    )}
    <Text style={styles.features}>
      🔧 Connect with contractors{'\n'}
      🏠 Post home improvement jobs{'\n'}
      💬 Real-time messaging{'\n'}
      💳 Secure payments
    </Text>
  </View>
);

// Main App Component
export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [components, setComponents] = useState<any>({});
  const [error, setError] = useState<string>('');

  useEffect(() => {
    initializeApp();
    setupDeepLinking();
  }, []);

  const setupDeepLinking = async () => {
    // Handle deep links for email confirmation
    const handleDeepLink = (url: string) => {
      console.log('📱 Deep link received:', url);
      
      if (url.includes('auth/confirm') || url.includes('auth/confirmed')) {
        console.log('✅ Email confirmation link detected');
        // The auth state will update automatically when user signs in
      }
    };

    // Handle app launch from link
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    } catch (error) {
      console.log('Deep linking initialization error:', error);
    }

    // Handle links while app is running
    const subscription = Linking.addEventListener('url', ({ url }: { url: string }) => {
      handleDeepLink(url);
    });

    return () => subscription?.remove();
  };

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting Mintenance app...');
      
      // Small delay for smoother loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      const loadedComponents: any = {};
      let hasAllComponents = true;

      // Try to load core components
      try {
        const { AuthProvider } = await import('./src/contexts/AuthContext');
        loadedComponents.AuthProvider = AuthProvider;
        console.log('✅ AuthProvider loaded');
      } catch (e: any) {
        console.warn('⚠️ AuthProvider failed, using fallback');
        try {
          const { AuthProvider } = await import('./src/contexts/AuthContext-fallback');
          loadedComponents.AuthProvider = AuthProvider;
        } catch (fallbackError) {
          console.error('❌ AuthProvider fallback failed');
          hasAllComponents = false;
        }
      }

      try {
        const AppNavigator = (await import('./src/navigation/AppNavigator')).default;
        loadedComponents.AppNavigator = AppNavigator;
        console.log('✅ AppNavigator loaded');
      } catch (e) {
        console.warn('⚠️ AppNavigator failed, using fallback');
        try {
          const AppNavigator = (await import('./src/navigation/AppNavigator-fallback')).default;
          loadedComponents.AppNavigator = AppNavigator;
        } catch (fallbackError) {
          console.error('❌ AppNavigator fallback failed');
          hasAllComponents = false;
        }
      }

      // Try to load optional components (won't fail startup if missing)
      try {
        const ErrorBoundary = (await import('./src/components/ErrorBoundary')).default;
        loadedComponents.ErrorBoundary = ErrorBoundary;
      } catch (e) {
        console.log('ℹ️ ErrorBoundary not available, using built-in');
      }

      try {
        const QueryProvider = (await import('./src/providers/QueryProvider')).default;
        loadedComponents.QueryProvider = QueryProvider;
      } catch (e) {
        console.log('ℹ️ QueryProvider not available, using basic setup');
      }

      setComponents(loadedComponents);
      setAppReady(hasAllComponents);
      
      if (hasAllComponents) {
        console.log('✅ App initialization completed successfully');
      } else {
        setError('Some components failed to load');
        console.log('⚠️ App initialized in fallback mode');
      }
      
    } catch (error: any) {
      console.error('❌ App initialization failed:', error);
      setError(error.message || 'Initialization failed');
      setAppReady(false);
    }
  };

  // Show loading screen
  if (!appReady && !error) {
    return (
      <>
        <LoadingScreen />
        <StatusBar style="auto" />
      </>
    );
  }

  // Show fallback if components failed to load
  if (!components.AuthProvider || !components.AppNavigator) {
    return (
      <>
        <FallbackScreen error={error} />
        <StatusBar style="auto" />
      </>
    );
  }

  // Render full app
  const { AuthProvider, AppNavigator, ErrorBoundary, QueryProvider } = components;
  
  const AppContent = () => (
    <AppNavigator />
  );

  // Build the provider hierarchy correctly
  const AppWithProviders = () => {
    if (QueryProvider && ErrorBoundary) {
      return (
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <AppContent />
              <StatusBar style="auto" />
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      );
    } else if (QueryProvider) {
      return (
        <AuthProvider>
          <QueryProvider>
            <AppContent />
            <StatusBar style="auto" />
          </QueryProvider>
        </AuthProvider>
      );
    } else if (ErrorBoundary) {
      return (
        <ErrorBoundary>
          <AuthProvider>
            <AppContent />
            <StatusBar style="auto" />
          </AuthProvider>
        </ErrorBoundary>
      );
    } else {
      return (
        <AuthProvider>
          <AppContent />
          <StatusBar style="auto" />
        </AuthProvider>
      );
    }
  };

  return <AppWithProviders />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  message: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  error: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  features: {
    fontSize: 16,
    color: '#666',
    textAlign: 'left',
    lineHeight: 24,
    backgroundColor: '#f0f4f8',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
  },
});