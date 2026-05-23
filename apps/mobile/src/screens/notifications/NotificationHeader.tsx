/**
 * NotificationHeader — Mint Editorial v2 (2026-05-23 redesign).
 *
 * Replaces the mint-gradient hero (with 2 decorative circles + bold
 * white sans heading + glassy "Mark All" pill) with the calm editorial
 * pattern: paper surface, mint eyebrow, serif "Notifications" title,
 * unread-count subtitle in muted ink. The "Mark all" CTA stays as a
 * mint-soft outlined pill in the top-right.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

interface NotificationHeaderProps {
  unreadCount: number;
  paddingTop: number;
  onMarkAllAsRead: () => void;
}

export const NotificationHeader: React.FC<NotificationHeaderProps> = ({
  unreadCount,
  paddingTop,
  onMarkAllAsRead,
}) => {
  return (
    <View style={[styles.header, { paddingTop: paddingTop + 12 }]}>
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Inbox</Text>
          <Text style={styles.title} numberOfLines={1}>
            Notifications
          </Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={onMarkAllAsRead}
            accessibilityRole='button'
            accessibilityLabel='Mark all as read'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name='checkmark-done-outline'
              size={16}
              color={me.brand}
            />
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: me.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: me.ink3,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: me.brandSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: me.brandSoft,
    marginBottom: 4,
  },
  markAllText: {
    fontSize: 12,
    color: me.brand,
    fontWeight: '700',
  },
});
