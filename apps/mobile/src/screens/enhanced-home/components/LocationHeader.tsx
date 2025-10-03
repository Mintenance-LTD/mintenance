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
import { theme } from '../../../theme';

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
        <TouchableOpacity style={styles.locationRow} onPress={onLocationPress}>
          <Ionicons name="location" size={16} color={theme.colors.secondary} />
          <Text style={styles.locationText}>{location}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
        <Ionicons name="notifications" size={24} color={theme.colors.textPrimary} />
        {hasNotifications && <View style={styles.notificationBadge} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  locationSection: {
    flex: 1,
  },
  locationLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceTertiary,
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
    backgroundColor: theme.colors.error,
  },
});
