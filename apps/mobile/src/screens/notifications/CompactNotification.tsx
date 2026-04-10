/**
 * CompactNotification Component
 *
 * Individual notification card with icon, content, time display, and mark-read button.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { NotificationData } from '../../services/NotificationService';
import { ICON_COLORS, getIconName } from './notificationConfig';
import { formatRelativeTime, stripEmoji } from './notificationFilters';

interface CompactNotificationProps {
  notification: NotificationData;
  onPress: () => void;
  onMarkRead?: () => void;
}

export const CompactNotification: React.FC<CompactNotificationProps> = ({
  notification,
  onPress,
  onMarkRead,
}) => {
  const colors = ICON_COLORS[notification.type] ??
    ICON_COLORS.system ?? {
      icon: theme.colors.textSecondary,
      bg: theme.colors.backgroundSecondary,
    };
  return (
    <TouchableOpacity
      style={[styles.notifCard, !notification.read && styles.notifCardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={`${notification.read ? '' : 'Unread: '}${notification.title}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
        <Ionicons
          name={getIconName(notification.type)}
          size={20}
          color={colors.icon}
        />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text
            style={[
              styles.notifTitle,
              !notification.read && styles.notifTitleUnread,
            ]}
            numberOfLines={1}
          >
            {stripEmoji(notification.title)}
          </Text>
          <Text style={styles.notifTime}>
            {formatRelativeTime(notification.createdAt)}
          </Text>
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>
          {notification.body}
        </Text>
      </View>
      {!notification.read && (
        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={(e) => {
            e.stopPropagation();
            onMarkRead?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole='button'
          accessibilityLabel='Mark as read'
        >
          <Ionicons name='checkmark' size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  notifCardUnread: {
    backgroundColor: theme.colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  markReadBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    flexShrink: 0,
  },
});
