import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MutualConnectionsService } from '../services/MutualConnectionsService';
import { ConnectionStatus } from '../types';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import { useHaptics } from '../utils/haptics';

interface ConnectButtonProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName: string;
  targetUserRole: 'contractor' | 'homeowner';
  size?: 'small' | 'medium' | 'large';
  style?: any;
  onConnectionChange?: (status: ConnectionStatus | null) => void;
}

const ConnectButton: React.FC<ConnectButtonProps> = ({
  currentUserId,
  targetUserId,
  targetUserName,
  targetUserRole,
  size = 'medium',
  style,
  onConnectionChange,
}) => {
  const haptics = useHaptics();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadConnectionStatus();
  }, [currentUserId, targetUserId]);

  const loadConnectionStatus = async () => {
    try {
      const status = await MutualConnectionsService.getConnectionStatus(
        currentUserId,
        targetUserId
      );
      setConnectionStatus(status);
      onConnectionChange?.(status);
    } catch (error) {
      logger.error('Error loading connection status:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      setLoading(true);
      haptics.impactLight();

      await MutualConnectionsService.sendConnectionRequest(
        currentUserId,
        targetUserId,
        `Hi ${targetUserName}, I'd like to connect with you on Mintenance!`
      );

      setConnectionStatus('pending');
      onConnectionChange?.('pending');

      Alert.alert(
        'Request Sent!',
        `Your connection request has been sent to ${targetUserName}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      logger.error('Error sending connection request:', error);
      Alert.alert(
        'Error',
        error instanceof Error && error.message.includes('already exists')
          ? 'A connection request has already been sent or you are already connected.'
          : 'Failed to send connection request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel your connection request to ${targetUserName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              haptics.impactLight();

              // Find and cancel the pending request
              const requests = await MutualConnectionsService.getConnectionRequests(targetUserId);
              const pendingRequest = requests.find(r => r.requesterId === currentUserId);

              if (pendingRequest) {
                await MutualConnectionsService.rejectConnectionRequest(pendingRequest.id);
                setConnectionStatus(null);
                onConnectionChange?.(null);
              }
            } catch (error) {
              logger.error('Error canceling connection request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getButtonConfig = () => {
    if (initialLoading) {
      return {
        text: '',
        icon: null,
        backgroundColor: theme.colors.surfaceSecondary,
        textColor: theme.colors.textSecondary,
        onPress: () => {},
        disabled: true,
      };
    }

    switch (connectionStatus) {
      case 'accepted':
        return {
          text: 'Connected',
          icon: 'checkmark-circle' as const,
          backgroundColor: theme.colors.secondary,
          textColor: theme.colors.textInverse,
          onPress: () => {
            Alert.alert(
              'Connected',
              `You are connected with ${targetUserName}. You can message them anytime!`,
              [{ text: 'OK' }]
            );
          },
          disabled: false,
        };
      case 'pending':
        return {
          text: 'Pending',
          icon: 'time' as const,
          backgroundColor: theme.colors.surfaceSecondary,
          textColor: theme.colors.textSecondary,
          onPress: handleCancelRequest,
          disabled: false,
        };
      case 'blocked':
        return {
          text: 'Blocked',
          icon: 'ban' as const,
          backgroundColor: theme.colors.surfaceSecondary,
          textColor: theme.colors.error,
          onPress: () => {},
          disabled: true,
        };
      default:
        return {
          text: 'Connect',
          icon: 'person-add' as const,
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.textInverse,
          onPress: handleSendRequest,
          disabled: false,
        };
    }
  };

  const config = getButtonConfig();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          fontSize: 12,
          iconSize: 14,
        };
      case 'large':
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 16,
          iconSize: 20,
        };
      default: // medium
        return {
          paddingVertical: 10,
          paddingHorizontal: 16,
          fontSize: 14,
          iconSize: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (currentUserId === targetUserId) {
    return null; // Don't show connect button for self
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        style,
      ]}
      onPress={config.onPress}
      disabled={config.disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={`${config.text} with ${targetUserName}`}
    >
      {loading || initialLoading ? (
        <ActivityIndicator size="small" color={config.textColor} />
      ) : (
        <>
          {config.icon && (
            <Ionicons
              name={config.icon}
              size={sizeStyles.iconSize}
              color={config.textColor}
              style={config.text ? styles.icon : undefined}
            />
          )}
          {config.text && (
            <Text
              style={[
                styles.text,
                {
                  color: config.textColor,
                  fontSize: sizeStyles.fontSize,
                },
              ]}
            >
              {config.text}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    ...theme.shadows.sm,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
  },
});

export default ConnectButton;