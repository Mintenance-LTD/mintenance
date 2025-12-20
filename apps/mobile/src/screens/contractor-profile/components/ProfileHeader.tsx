/**
 * ProfileHeader Component
 * 
 * Displays contractor avatar, name, location, and edit button.
 * 
 * @filesize Target: <100 lines
 * @compliance Single Responsibility - Profile header display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface ProfileHeaderProps {
  name: string;
  location: string;
  onEditPress?: () => void;
  showEditButton?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  location,
  onEditPress,
  showEditButton = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar} />
        {showEditButton && (
          <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
            <Ionicons name="pencil" size={14} color={theme.colors.white} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.locationText}>{location}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing['2xl'],
    backgroundColor: theme.colors.borderLight,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.borderDark,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  editButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.white,
  },
  infoSection: {
    flex: 1,
    marginLeft: theme.spacing.xl,
  },
  name: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
});
