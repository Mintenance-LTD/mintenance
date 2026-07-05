import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { BiometricService } from '../services/BiometricService';
import { logger } from '../utils/logger';
import { me } from '../design-system/mint-editorial';

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
        const typeNames = types.map((type) =>
          BiometricService.getTypeDisplayName(type)
        );
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
        await enableBiometric();
        setIsEnabled(true);
        Alert.alert(
          'Success',
          `${biometricTypes.join(' and ')} authentication has been enabled for your account.`
        );
      } else {
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
      if (
        !errorMessage.includes('cancelled') &&
        !errorMessage.includes('canceled')
      ) {
        Alert.alert(
          'Test Failed',
          'Biometric authentication test failed. Please check your device settings.'
        );
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
          <Ionicons
            name='information-circle-outline'
            size={24}
            color={me.ink3}
          />
          <Text style={styles.unavailableText}>
            Biometric authentication is not available on this device or no
            biometrics are enrolled.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name='finger-print' size={24} color={me.ink} />
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
            false: me.line,
            true: me.brand,
          }}
          thumbColor={me.surface}
          accessibilityLabel='Enable biometric sign-in'
          accessibilityRole='switch'
          accessibilityState={{ checked: isEnabled }}
        />
      </View>

      {isEnabled && (
        <TouchableOpacity
          style={styles.testButton}
          onPress={testBiometric}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel='Test biometric authentication'
          accessibilityHint='Double tap to verify your biometric settings are working'
        >
          <Ionicons
            name='checkmark-circle-outline'
            size={20}
            color={me.brand}
          />
          <Text style={styles.testButtonText}>
            Test Biometric Authentication
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoBox}>
        <Ionicons name='shield-checkmark-outline' size={16} color={me.infoFg} />
        <Text style={styles.infoText}>
          Your biometric data is stored securely on your device and never shared
          with our servers.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    ...me.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: me.ink,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    color: me.ink2,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: me.ink,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: me.bg2,
    borderRadius: 12,
    marginBottom: 16,
  },
  testButtonText: {
    fontSize: 15,
    color: me.ink,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: me.infoBg,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: me.infoFg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
    marginLeft: 8,
  },
  unavailableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: me.bg2,
    borderRadius: 12,
  },
  unavailableText: {
    flex: 1,
    fontSize: 15,
    color: me.ink3,
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default BiometricSettings;
