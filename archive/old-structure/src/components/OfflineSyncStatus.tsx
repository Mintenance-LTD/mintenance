import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from '../hooks/useNetworkState';
import { OfflineManager, SyncStatus } from '../services/OfflineManager';
import { theme } from '../theme';
import { logger } from '../utils/logger';

interface OfflineSyncStatusProps {
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
  compact?: boolean;
}

const OfflineSyncStatus: React.FC<OfflineSyncStatusProps> = ({
  showWhenOnline = false,
  position = 'top',
  compact = false,
}) => {
  const { isOnline, connectionQuality } = useNetworkState();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  const slideAnim = new Animated.Value(position === 'top' ? -100 : 100);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = OfflineManager.onSyncStatusChange((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });

    // Get initial pending count
    OfflineManager.getPendingActionsCount().then(setPendingCount);

    return unsubscribe;
  }, []);

  useEffect(() => {
    const shouldShow =
      !isOnline ||
      (showWhenOnline && pendingCount > 0) ||
      syncStatus === 'syncing';

    if (shouldShow !== visible) {
      setVisible(shouldShow);

      Animated.timing(slideAnim, {
        toValue: shouldShow ? 0 : position === 'top' ? -100 : 100,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, showWhenOnline, pendingCount, syncStatus, visible, position]);

  useEffect(() => {
    // Pulse animation for syncing status
    if (syncStatus === 'syncing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [syncStatus]);

  const handleSyncNow = async () => {
    try {
      await OfflineManager.syncQueue();
      logger.userAction('manual_sync_triggered');
    } catch (error) {
      Alert.alert(
        'Sync Failed',
        'Unable to sync pending changes. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
      logger.error('Manual sync failed:', error);
    }
  };

  const handleClearQueue = () => {
    Alert.alert(
      'Clear Pending Changes',
      `Are you sure you want to discard ${pendingCount} pending changes? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await OfflineManager.clearQueue();
            logger.userAction('offline_queue_cleared', { count: pendingCount });
          },
        },
      ]
    );
  };

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: 'cloud-offline-outline' as const,
        color: theme.colors.warning,
        text: 'Offline',
        description:
          pendingCount > 0
            ? `${pendingCount} changes pending`
            : 'Working offline',
        backgroundColor: theme.colors.warningLight,
      };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          icon: 'sync-outline' as const,
          color: theme.colors.primary,
          text: 'Syncing',
          description: 'Syncing pending changes...',
          backgroundColor: theme.colors.primaryLight,
        };
      case 'error':
        return {
          icon: 'alert-circle-outline' as const,
          color: theme.colors.error,
          text: 'Sync Error',
          description: `${pendingCount} changes failed to sync`,
          backgroundColor: theme.colors.errorLight,
        };
      case 'pending':
        return {
          icon: 'time-outline' as const,
          color: theme.colors.warning,
          text: 'Pending',
          description: `${pendingCount} changes waiting to sync`,
          backgroundColor: theme.colors.warningLight,
        };
      default:
        return {
          icon: 'checkmark-circle-outline' as const,
          color: theme.colors.success,
          text: 'Synced',
          description: 'All changes synced',
          backgroundColor: theme.colors.successLight,
        };
    }
  };

  const statusConfig = getStatusConfig();

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { transform: [{ translateY: slideAnim }] },
          { backgroundColor: statusConfig.backgroundColor },
        ]}
      >
        <View style={styles.compactContent}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons
              name={statusConfig.icon}
              size={16}
              color={statusConfig.color}
            />
          </Animated.View>
          <Text style={[styles.compactText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.topPosition : styles.bottomPosition,
        { transform: [{ translateY: slideAnim }] },
        { backgroundColor: statusConfig.backgroundColor },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons
              name={statusConfig.icon}
              size={24}
              color={statusConfig.color}
            />
          </Animated.View>
          <View style={styles.textContent}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
            <Text style={styles.descriptionText}>
              {statusConfig.description}
            </Text>
            {connectionQuality === 'poor' && (
              <Text style={styles.connectionText}>
                Slow connection detected
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightContent}>
          {pendingCount > 0 && isOnline && syncStatus !== 'syncing' && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: statusConfig.color }]}
              onPress={handleSyncNow}
            >
              <Text
                style={[styles.actionButtonText, { color: statusConfig.color }]}
              >
                Sync Now
              </Text>
            </TouchableOpacity>
          )}

          {pendingCount > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearQueue}
            >
              <Ionicons
                name='trash-outline'
                size={16}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 1000,
  },
  topPosition: {
    top: 0,
    paddingTop: theme.spacing[12], // Account for status bar
  },
  bottomPosition: {
    bottom: 0,
    paddingBottom: theme.spacing[8], // Account for safe area
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContent: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  statusText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  descriptionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  connectionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.warning,
    fontStyle: 'italic',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  actionButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  clearButton: {
    padding: theme.spacing[2],
    borderRadius: theme.borderRadius.base,
  },
  compactContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    paddingTop: theme.spacing[12], // Account for status bar
    zIndex: 1000,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
  },
  compactText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default OfflineSyncStatus;
