/**
 * MFA Verification Screen for React Native
 *
 * Provides MFA verification during login with support for:
 * - TOTP (authenticator app)
 * - Backup codes
 * - Biometric authentication (before MFA)
 * - Remember device option
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../utils/mobileApiClient';

interface MFAVerificationScreenProps {
  preMfaToken: string;
  redirectScreen?: string;
}

type VerificationMethod = 'totp' | 'backup_code';

export default function MFAVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { preMfaToken, redirectScreen } = route.params as MFAVerificationScreenProps;

  const [code, setCode] = useState('');
  const [method, setMethod] = useState<VerificationMethod>('totp');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Check biometric availability
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  // Auto-focus input
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, [method]);

  // Prompt for biometric on mount
  useEffect(() => {
    if (biometricAvailable && !biometricVerified) {
      promptBiometric();
    }
  }, [biometricAvailable]);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      logger.error('Failed to check biometric availability', error, { service: 'mobile' });
    }
  };

  const promptBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity',
        cancelLabel: 'Skip',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setBiometricVerified(true);
      }
    } catch (error) {
      logger.error('Biometric authentication failed', error, { service: 'mobile' });
    }
  };

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid verification code');
      return;
    }

    if (!biometricVerified && biometricAvailable) {
      Alert.alert(
        'Biometric Required',
        'Please verify your identity with biometrics first',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify', onPress: promptBiometric },
        ]
      );
      return;
    }

    setLoading(true);

    try {
      // Verify MFA via API client (handles auth headers and retries)
      const data = await mobileApiClient.post<{
        requiresNewBackupCodes?: boolean;
        user: { role: string };
      }>('/api/auth/mfa/verify', {
        preMfaToken,
        code,
        method,
        rememberDevice,
      });

      // Store trusted device token if provided
      if (rememberDevice) {
        // Note: In production, extract and store the trusted device token from cookies
        await AsyncStorage.setItem('mfa_device_trusted', 'true');
      }

      // Show warning if backup codes are low
      if (data.requiresNewBackupCodes) {
        Alert.alert(
          'Backup Codes Low',
          'You have used a backup code. Generate new codes in settings.',
          [{ text: 'OK' }]
        );
      }

      // Navigate to appropriate screen
      if (redirectScreen) {
        navigation.navigate(redirectScreen as never);
      } else {
        const defaultScreen = data.user.role === 'contractor' ? 'ContractorDashboard' : 'Dashboard';
        navigation.navigate(defaultScreen as never);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      Alert.alert('Verification Failed', message);
      logger.error('MFA verification error', error, { service: 'mobile' });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string) => {
    // Remove non-alphanumeric characters for backup codes
    // Remove non-numeric for TOTP
    const sanitized = method === 'totp'
      ? text.replace(/\D/g, '')
      : text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    setCode(sanitized);
  };

  const switchMethod = (newMethod: VerificationMethod) => {
    setMethod(newMethod);
    setCode('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole='header'>Two-Factor Authentication</Text>
          <Text style={styles.subtitle}>
            Enter your verification code to complete login
          </Text>
        </View>

        {/* Method selector */}
        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              method === 'totp' && styles.methodButtonActive,
            ]}
            onPress={() => switchMethod('totp')}
            accessibilityRole='tab'
            accessibilityLabel='Authenticator app verification'
            accessibilityState={{ selected: method === 'totp' }}
          >
            <Text
              style={[
                styles.methodButtonText,
                method === 'totp' && styles.methodButtonTextActive,
              ]}
            >
              Authenticator App
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              method === 'backup_code' && styles.methodButtonActive,
            ]}
            onPress={() => switchMethod('backup_code')}
            accessibilityRole='tab'
            accessibilityLabel='Backup code verification'
            accessibilityState={{ selected: method === 'backup_code' }}
          >
            <Text
              style={[
                styles.methodButtonText,
                method === 'backup_code' && styles.methodButtonTextActive,
              ]}
            >
              Backup Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Code input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            {method === 'totp' ? '6-digit code' : 'Backup code'}
          </Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={code}
            onChangeText={handleCodeChange}
            placeholder={method === 'totp' ? '000000' : 'XXXXXXXX'}
            placeholderTextColor="#9CA3AF"
            maxLength={method === 'totp' ? 6 : 8}
            keyboardType={method === 'totp' ? 'number-pad' : 'default'}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            editable={!loading}
            accessibilityLabel={method === 'totp' ? 'Enter 6-digit verification code' : 'Enter backup code'}
            accessibilityHint={method === 'totp' ? 'Enter the code from your authenticator app' : 'Enter one of your backup codes'}
          />
          <Text style={styles.hint}>
            {method === 'totp'
              ? 'Open your authenticator app and enter the 6-digit code'
              : 'Enter one of your backup codes (use each code only once)'}
          </Text>
        </View>

        {/* Remember device checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setRememberDevice(!rememberDevice)}
          disabled={loading}
          accessibilityRole='checkbox'
          accessibilityLabel='Trust this device for 30 days'
          accessibilityState={{ checked: rememberDevice }}
        >
          <View style={[styles.checkbox, rememberDevice && styles.checkboxChecked]}>
            {rememberDevice && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Trust this device for 30 days</Text>
        </TouchableOpacity>

        {/* Verify button */}
        <TouchableOpacity
          style={[
            styles.button,
            (loading || !code || code.length < 6) && styles.buttonDisabled,
          ]}
          onPress={handleVerify}
          disabled={loading || !code || code.length < 6}
          accessibilityRole='button'
          accessibilityLabel={loading ? 'Verifying code' : 'Verify code'}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        {/* Help text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>Lost access to your authenticator app?</Text>
          <TouchableOpacity
            onPress={() => switchMethod('backup_code')}
            accessibilityRole='link'
            accessibilityLabel='Switch to backup code verification'
          >
            <Text style={styles.helpLink}>Use a backup code instead</Text>
          </TouchableOpacity>
        </View>

        {/* Back to login */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login' as never)}
          disabled={loading}
          accessibilityRole='link'
          accessibilityLabel='Back to login'
        >
          <Text style={styles.backButtonText}>Back to login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  methodButtonActive: {
    borderBottomColor: '#3B82F6',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  methodButtonTextActive: {
    color: '#3B82F6',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    letterSpacing: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  helpLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
