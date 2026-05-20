/**
 * LocationHeader Component
 *
 * Displays current location and notification button.
 *
 * @filesize Target: <60 lines
 * @compliance Single Responsibility - Location display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface LocationHeaderProps {
  location: string;
  onLocationPress: () => void;
  onNotificationPress: () => void;
  hasNotifications?: boolean;
}

export const LocationHeader: React.FC<LocationHeaderProps> = ({
  location,
  onLocationPress,
  onNotificationPress,
  hasNotifications = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.locationSection}>
        <Text style={styles.locationLabel}>Location</Text>
        <TouchableOpacity
          style={styles.locationRow}
          onPress={onLocationPress}
          accessibilityRole='button'
          accessibilityLabel={`Current location: ${location}. Double tap to change`}
        >
          <Ionicons name='location' size={16} color={me.ink2} />
          <Text style={styles.locationText}>{location}</Text>
          <Ionicons name='chevron-down' size={16} color={me.ink2} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.notificationButton}
        onPress={onNotificationPress}
        accessibilityRole='button'
        accessibilityLabel={
          hasNotifications
            ? 'Notifications, you have new notifications'
            : 'Notifications'
        }
        accessibilityHint='Double tap to view notifications'
      >
        <Ionicons name='notifications' size={24} color={me.ink} />
        {hasNotifications && (
          <View style={styles.notificationBadge} accessible={false} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: me.surface,
  },
  locationSection: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: me.ink3,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: me.bg2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: me.errFg,
  },
});
