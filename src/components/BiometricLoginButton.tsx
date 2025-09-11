import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { BiometricService } from '../services/BiometricService';
import { theme } from '../theme';
import { logger } from '../utils/logger';

interface BiometricLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const BiometricLoginButton: React.FC<BiometricLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const { signInWithBiometrics } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const available = await BiometricService.isAvailable();
      const enabled = await BiometricService.isBiometricEnabled();

      setIsAvailable(available);
      setIsEnabled(enabled);

      if (available) {
        const types = await BiometricService.getSupportedTypes();
        const typeNames = types.map((type) =>
          BiometricService.getTypeDisplayName(type)
        );
        setBiometricType(typeNames.join(' or '));
      }
    } catch (error) {
      logger.error('Error checking biometric status:', error);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isAvailable || !isEnabled) {
      return;
    }

    setLoading(true);
    try {
      await signInWithBiometrics();
      onSuccess?.();
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Handle specific error cases
      if (
        errorMessage.includes('cancelled') ||
        errorMessage.includes('canceled')
      ) {
        // User cancelled - don't show error
        return;
      }

      Alert.alert(
        'Authentication Failed',
        `${biometricType} authentication failed. Please try again or use your password.`
      );

      onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if biometrics aren't available or enabled
  if (!isAvailable || !isEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Quick Sign In</Text>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleBiometricLogin}
        disabled={loading}
        accessibilityRole='button'
        accessibilityLabel={`Sign in with ${biometricType}`}
        accessibilityHint='Use biometric authentication to sign in quickly'
      >
        <Ionicons
          name='finger-print'
          size={32}
          color={loading ? theme.colors.textTertiary : theme.colors.primary}
        />
        <Text style={[styles.buttonText, loading && styles.buttonTextDisabled]}>
          {loading ? 'Authenticating...' : `Use ${biometricType}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: theme.spacing[6],
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[3],
    fontWeight: theme.typography.fontWeight.medium,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing[2],
  },
  buttonTextDisabled: {
    color: theme.colors.textTertiary,
  },
});

export default BiometricLoginButton;
