import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Simple error boundary component
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.log('Error caught by boundary:', error);
    console.log('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            The app encountered an error. Please restart the app.
          </Text>
          <Text style={styles.errorDetails}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Simple loading component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.appTitle}>Mintenance</Text>
    <Text style={styles.subtitle}>Contractor Discovery Marketplace</Text>
    <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
    <Text style={styles.loadingText}>Starting up...</Text>
  </View>
);

// Fallback app component
const FallbackApp = ({ error }: { error?: string }) => (
  <View style={styles.fallbackContainer}>
    <Text style={styles.appTitle}>Mintenance</Text>
    <Text style={styles.subtitle}>Contractor Discovery Marketplace</Text>
    <Text style={styles.fallbackText}>
      Welcome to Mintenance! The app is in development mode.
    </Text>
    {error && (
      <Text style={styles.errorInfo}>
        Debug info: {error}
      </Text>
    )}
    <Text style={styles.instructionText}>
      • Connect contractors with homeowners{'\n'}
      • Post jobs and get bids{'\n'}
      • Real-time messaging{'\n'}
      • Secure payments
    </Text>
  </View>
);

export default function App() {
  const [appState, setAppState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [components, setComponents] = useState<any>({});
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing Mintenance app...');
        
        // Add a small delay to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 1000));

        const loadedComponents: any = {};
        
        // Try to load each component safely with fallbacks
        try {
          const { AuthProvider } = await import('./src/contexts/AuthContext');
          loadedComponents.AuthProvider = AuthProvider;
          console.log('✅ AuthProvider loaded');
        } catch (e) {
          console.warn('⚠️ AuthProvider failed to load, using fallback:', e);
          try {
            const { AuthProvider } = await import('./src/contexts/AuthContext-fallback');
            loadedComponents.AuthProvider = AuthProvider;
            console.log('✅ AuthProvider fallback loaded');
          } catch (fallbackError) {
            console.error('❌ AuthProvider fallback also failed:', fallbackError);
          }
        }

        try {
          const AppNavigator = (await import('./src/navigation/AppNavigator')).default;
          loadedComponents.AppNavigator = AppNavigator;
          console.log('✅ AppNavigator loaded');
        } catch (e) {
          console.warn('⚠️ AppNavigator failed to load, using fallback:', e);
          try {
            const AppNavigator = (await import('./src/navigation/AppNavigator-fallback')).default;
            loadedComponents.AppNavigator = AppNavigator;
            console.log('✅ AppNavigator fallback loaded');
          } catch (fallbackError) {
            console.error('❌ AppNavigator fallback also failed:', fallbackError);
          }
        }

        try {
          const ErrorBoundary = (await import('./src/components/ErrorBoundary')).default;
          loadedComponents.ErrorBoundary = ErrorBoundary;
          console.log('✅ ErrorBoundary loaded');
        } catch (e) {
          console.warn('⚠️ ErrorBoundary failed to load, using fallback:', e);
          try {
            const ErrorBoundary = (await import('./src/components/ErrorBoundary-fallback')).default;
            loadedComponents.ErrorBoundary = ErrorBoundary;
            console.log('✅ ErrorBoundary fallback loaded');
          } catch (fallbackError) {
            console.error('❌ ErrorBoundary fallback also failed:', fallbackError);
          }
        }

        try {
          const QueryProvider = (await import('./src/providers/QueryProvider')).default;
          loadedComponents.QueryProvider = QueryProvider;
          console.log('✅ QueryProvider loaded');
        } catch (e) {
          console.warn('⚠️ QueryProvider failed to load, using fallback:', e);
          try {
            const QueryProvider = (await import('./src/providers/QueryProvider-fallback')).default;
            loadedComponents.QueryProvider = QueryProvider;
            console.log('✅ QueryProvider fallback loaded');
          } catch (fallbackError) {
            console.error('❌ QueryProvider fallback also failed:', fallbackError);
          }
        }

        // Initialize optional systems (don't fail if these don't work)
        try {
          const { errorMonitoring } = await import('./src/utils/errorMonitoring');
          console.log('✅ Error monitoring available');
        } catch (e) {
          console.log('ℹ️ Error monitoring not available (optional)');
        }

        try {
          const { performanceBudgetManager } = await import('./src/utils/performanceBudgets');
          console.log('✅ Performance monitoring available');
        } catch (e) {
          console.log('ℹ️ Performance monitoring not available (optional)');
        }

        setComponents(loadedComponents);
        
        // Check if we have minimum required components
        if (loadedComponents.AuthProvider && loadedComponents.AppNavigator) {
          setAppState('ready');
          console.log('✅ App initialized successfully');
        } else {
          setError('Missing core components');
          setAppState('error');
          console.log('⚠️ App initialized with missing components, using fallback');
        }
        
      } catch (error: any) {
        console.error('❌ Failed to initialize app:', error);
        setError(error.message || 'Initialization failed');
        setAppState('error');
      }
    };

    initializeApp();
  }, []);

  // Loading state
  if (appState === 'loading') {
    return (
      <SimpleErrorBoundary>
        <LoadingScreen />
        <StatusBar style="auto" />
      </SimpleErrorBoundary>
    );
  }

  // Error state or missing components
  if (appState === 'error' || !components.AuthProvider || !components.AppNavigator) {
    return (
      <SimpleErrorBoundary>
        <FallbackApp error={error} />
        <StatusBar style="auto" />
      </SimpleErrorBoundary>
    );
  }

  // Full app
  const { AuthProvider, AppNavigator, ErrorBoundary, QueryProvider } = components;
  const ErrorComponent = ErrorBoundary || SimpleErrorBoundary;
  
  return (
    <SimpleErrorBoundary>
      <ErrorComponent>
        {QueryProvider ? (
          <QueryProvider>
            <AuthProvider>
              <AppNavigator />
              <StatusBar style="auto" />
            </AuthProvider>
          </QueryProvider>
        ) : (
          <AuthProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        )}
      </ErrorComponent>
    </SimpleErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 30,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 30,
  },
  appTitle: {
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
  fallbackText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'left',
    lineHeight: 24,
    backgroundColor: '#f0f4f8',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorDetails: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
  },
  errorInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});