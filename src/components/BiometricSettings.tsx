import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { BiometricService } from '../services/BiometricService';
import { theme } from '../theme';
import { logger } from '../utils/logger';


const BiometricSettings: React.FC = () => {
  const { enableBiometric, disableBiometric, user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
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
        const typeNames = types.map(type => BiometricService.getTypeDisplayName(type));
        setBiometricTypes(typeNames);
      }
    } catch (error) {
      logger.error('Error checking biometric status:', error);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (!user) return;

    setLoading(true);
    try {
      if (value) {
        // Enable biometric authentication
        await enableBiometric();
        setIsEnabled(true);
        Alert.alert(
          'Success',
          `${biometricTypes.join(' and ')} authentication has been enabled for your account.`
        );
      } else {
        // Confirm before disabling
        Alert.alert(
          'Disable Biometric Authentication',
          `Are you sure you want to disable ${biometricTypes.join(' and ')} authentication?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await disableBiometric();
                setIsEnabled(false);
              },
            },
          ]
        );
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      Alert.alert(
        'Error',
        `Failed to ${value ? 'enable' : 'disable'} biometric authentication: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testBiometric = async () => {
    try {
      setLoading(true);
      await BiometricService.authenticate('Test your biometric authentication');
      Alert.alert('Success', 'Biometric authentication test successful!');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('canceled')) {
        Alert.alert('Test Failed', 'Biometric authentication test failed. Please check your device settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render if biometrics aren't available
  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Ionicons name="information-circle-outline" size={24} color={theme.colors.textTertiary} />
          <Text style={styles.unavailableText}>
            Biometric authentication is not available on this device or no biometrics are enrolled.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="finger-print" size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Biometric Authentication</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Available: {biometricTypes.join(', ')}
      </Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Enable Biometric Sign-In</Text>
          <Text style={styles.settingDescription}>
            Use {biometricTypes.join(' or ')} to sign in quickly and securely
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggleBiometric}
          disabled={loading}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.secondary,
          }}
          thumbColor={isEnabled ? theme.colors.surface : theme.colors.textTertiary}
        />
      </View>

      {isEnabled && (
        <TouchableOpacity
          style={styles.testButton}
          onPress={testBiometric}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.testButtonText}>Test Biometric Authentication</Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.info} />
        <Text style={styles.infoText}>
          Your biometric data is stored securely on your device and never shared with our servers.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[5],
    marginVertical: theme.spacing[3],
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[4],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[4],
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing[3],
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  settingDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing[4],
  },
  testButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing[2],
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceSecondary,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.base,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.info,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginLeft: theme.spacing[2],
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.base,
  },
  unavailableText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing[3],
    lineHeight: 20,
  },
});

export default BiometricSettings;