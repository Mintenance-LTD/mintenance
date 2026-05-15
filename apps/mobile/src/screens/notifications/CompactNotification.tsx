/**
 * CompactNotification Component
 *
 * Individual notification card with icon, content, time display, and mark-read button.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
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
      icon: me.ink2,
      bg: me.bg2,
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
          <Ionicons name='checkmark' size={14} color={me.brand} />
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
    backgroundColor: me.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  notifCardUnread: {
    backgroundColor: me.brandSoft,
    borderLeftWidth: 3,
    borderLeftColor: me.brand,
  },
  markReadBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.brandSoft,
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
    color: me.ink,
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifBody: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 12,
    color: me.ink3,
    flexShrink: 0,
  },
});
