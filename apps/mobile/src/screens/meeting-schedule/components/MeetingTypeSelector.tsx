/**
 * MeetingTypeSelector Component
 * 
 * Meeting type selection with duration options.
 * 
 * @filesize Target: <100 lines
 * @compliance Single Responsibility - Meeting type selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { MeetingType, MeetingTypeOption } from '../viewmodels/MeetingScheduleViewModel';

interface MeetingTypeSelectorProps {
  meetingTypes: MeetingTypeOption[];
  selectedType: MeetingType;
  duration: number;
  onTypeSelect: (type: MeetingType) => void;
  onDurationChange: (duration: number) => void;
}

export const MeetingTypeSelector: React.FC<MeetingTypeSelectorProps> = ({
  meetingTypes,
  selectedType,
  duration,
  onTypeSelect,
  onDurationChange,
}) => {
  const durationOptions = [30, 60, 90, 120, 180, 240];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Meeting Type</Text>
      
      <View style={styles.typeGrid}>
        {meetingTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeCard,
              selectedType === type.id && styles.typeCardSelected,
            ]}
            onPress={() => {
              onTypeSelect(type.id);
              onDurationChange(type.estimatedDuration);
            }}
          >
            <View style={styles.typeIcon}>
              <Ionicons 
                name={type.icon as any} 
                size={24} 
                color={selectedType === type.id ? theme.colors.textInverse : theme.colors.primary} 
              />
            </View>
            <Text style={[
              styles.typeName,
              selectedType === type.id && styles.typeNameSelected,
            ]}>
              {type.name}
            </Text>
            <Text style={[
              styles.typeDescription,
              selectedType === type.id && styles.typeDescriptionSelected,
            ]}>
              {type.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.durationSection}>
        <Text style={styles.durationLabel}>Duration (minutes)</Text>
        <View style={styles.durationGrid}>
          {durationOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.durationButton,
                duration === option && styles.durationButtonSelected,
              ]}
              onPress={() => onDurationChange(option)}
            >
              <Text style={[
                styles.durationText,
                duration === option && styles.durationTextSelected,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  typeGrid: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  typeCard: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  typeName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  typeNameSelected: {
    color: theme.colors.textInverse,
  },
  typeDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  typeDescriptionSelected: {
    color: theme.colors.textInverseMuted,
  },
  durationSection: {
    marginTop: theme.spacing.lg,
  },
  durationLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  durationButton: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  durationButtonSelected: {
    backgroundColor: theme.colors.secondary,
  },
  durationText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  durationTextSelected: {
    color: theme.colors.textInverse,
  },
});
