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
        color: '#F59E0B',
        text: 'Offline',
        description:
          pendingCount > 0
            ? `${pendingCount} changes pending`
            : 'Working offline',
        backgroundColor: '#FEF3C7',
      };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          icon: 'sync-outline' as const,
          color: '#222222',
          text: 'Syncing',
          description: 'Syncing pending changes...',
          backgroundColor: 'rgba(34, 34, 34, 0.04)',
        };
      case 'error':
        return {
          icon: 'alert-circle-outline' as const,
          color: '#EF4444',
          text: 'Sync Error',
          description: `${pendingCount} changes failed to sync`,
          backgroundColor: '#FEF2F2',
        };
      case 'pending':
        return {
          icon: 'time-outline' as const,
          color: '#F59E0B',
          text: 'Pending',
          description: `${pendingCount} changes waiting to sync`,
          backgroundColor: '#FEF3C7',
        };
      default:
        return {
          icon: 'checkmark-circle-outline' as const,
          color: '#10B981',
          text: 'Synced',
          description: 'All changes synced',
          backgroundColor: '#ECFDF5',
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
              accessibilityRole='button'
              accessibilityLabel={`Sync now, ${pendingCount} changes pending`}
              accessibilityHint='Double tap to sync pending changes to the server'
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
              accessibilityRole='button'
              accessibilityLabel={`Clear ${pendingCount} pending changes`}
              accessibilityHint='Double tap to discard all pending offline changes'
            >
              <Ionicons
                name='trash-outline'
                size={16}
                color='#B0B0B0'
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    zIndex: 1000,
  },
  topPosition: {
    top: 0,
    paddingTop: 48,
  },
  bottomPosition: {
    bottom: 0,
    paddingBottom: 32,
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
    marginLeft: 12,
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 12,
    color: '#717171',
    marginTop: 4,
  },
  connectionText: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearButton: {
    padding: 8,
    borderRadius: 12,
  },
  compactContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingTop: 48,
    zIndex: 1000,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default OfflineSyncStatus;
