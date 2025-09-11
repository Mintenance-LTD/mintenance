import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

// Minimal fallback app that's guaranteed to work
export default function App() {
  const handleGetStarted = () => {
    Alert.alert(
      'Welcome to Mintenance!',
      'This is a simplified version of the app. The full version is being loaded.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style='auto' />

      <View style={styles.content}>
        <Text style={styles.title}>🏠 Mintenance</Text>
        <Text style={styles.subtitle}>Home Maintenance Made Easy</Text>

        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            Connect with trusted contractors for all your home maintenance
            needs.
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 40,
    textAlign: 'center',
  },
  description: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    width: '100%',
  },
  descriptionText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});
