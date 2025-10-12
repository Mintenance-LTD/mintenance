import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { logger } from './src/utils/logger';

// Import components safely with fallbacks
let AuthProvider: React.ComponentType<any> | undefined;
let AppNavigator: React.ComponentType<any> | undefined;
let ErrorBoundary: React.ComponentType<{
  children: React.ReactNode;
  fallback?: (error: Error, resetError: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}> | undefined;
let QueryProvider: React.ComponentType<{ children: React.ReactNode }> | undefined;
let componentsLoaded = false;

// Try to load components
try {
  AuthProvider = require('./src/contexts/AuthContext').AuthProvider;
  AppNavigator = require('./src/navigation/AppNavigator').default;
  ErrorBoundary = require('./src/components/ErrorBoundary').default;
  QueryProvider = require('./src/providers/QueryProvider').default;
  componentsLoaded = true;
  logger.info('All main components loaded successfully', { service: 'app' });
} catch (error) {
  logger.error('Failed to import main components', error, { service: 'app' });
  componentsLoaded = false;
}

// Fallback component if imports fail
const FallbackApp = () => (
  <View style={{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  }}>
    <Text style={{
      fontSize: 32,
      fontWeight: 'bold',
      color: '#0F172A',
      marginBottom: 8,
      textAlign: 'center'
    }}>🏠 Mintenance</Text>
    <Text style={{
      fontSize: 24,
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: 16,
      textAlign: 'center'
    }}>Find Trusted Home Contractors Fast</Text>
    <Text style={{
      fontSize: 16,
      color: '#6b7280',
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 24,
    }}>Post your home project, compare verified contractor bids, and pay securely.</Text>
    <View style={{
      backgroundColor: '#10B981',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 16,
    }}>
      <Text style={{
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
      }}>Get Started</Text>
    </View>
  </View>
);

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize app with a small delay to ensure everything loads
    const initializeApp = async () => {
      try {
        // Give components time to load
        await new Promise(resolve => setTimeout(resolve, 100));
        logger.info('Mintenance app initializing', { service: 'app' });
        setIsInitialized(true);
      } catch (error) {
        logger.error('Failed to initialize app', error, { service: 'app' });
        setIsInitialized(true); // Still try to render
      }
    };

    initializeApp();
  }, []);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
      }}>
        <Text style={{ fontSize: 24, marginBottom: 20, color: '#0F172A' }}>🏠 Mintenance</Text>
        <Text style={{ color: '#6b7280' }}>Loading...</Text>
      </View>
    );
  }

  // Return fallback if components failed to load
  if (!componentsLoaded || !AuthProvider || !AppNavigator || !ErrorBoundary || !QueryProvider) {
    logger.warn('Using fallback app due to component loading issues', { service: 'app' });
    return <FallbackApp />;
  }

  logger.debug('Rendering full app with navigation', { service: 'app' });

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}