/**
 * MeetingTypeSelector Component
 *
 * Meeting type selection with duration options.
 *
 * @filesize Target: <100 lines
 * @compliance Single Responsibility - Meeting type selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]} testID="meeting-type-container">
      <Text style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>MEETING TYPE</Text>

      <View style={styles.typeGrid}>
        {meetingTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            testID={`meeting-type-${type.id}`}
            style={[
              styles.typeCard,
              { backgroundColor: theme.colors.backgroundSecondary },
              selectedType === type.id && { backgroundColor: theme.colors.textPrimary },
            ]}
            onPress={() => {
              onTypeSelect(type.id);
              onDurationChange(type.estimatedDuration);
            }}
          >
            <View style={[styles.typeIcon, { backgroundColor: theme.colors.surface }, selectedType === type.id && styles.typeIconSelected]}>
              <Ionicons
                name={type.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={selectedType === type.id ? theme.colors.textInverse : theme.colors.textSecondary}
              />
            </View>
            <Text style={[
              styles.typeName,
              { color: theme.colors.textPrimary },
              selectedType === type.id && { color: theme.colors.textInverse },
            ]}>
              {type.name}
            </Text>
            <Text style={[
              styles.typeDescription,
              { color: theme.colors.textSecondary },
              selectedType === type.id && styles.typeDescriptionSelected,
            ]}>
              {type.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.durationSection}>
        <Text style={[styles.durationLabel, { color: theme.colors.textPrimary }]}>Duration (minutes)</Text>
        <View style={styles.durationGrid}>
          {durationOptions.map((option) => (
            <TouchableOpacity
              key={option}
              testID={`duration-${option}`}
              style={[
                styles.durationButton,
                { backgroundColor: theme.colors.backgroundSecondary },
                duration === option && { backgroundColor: theme.colors.textPrimary },
              ]}
              onPress={() => onDurationChange(option)}
            >
              <Text style={[
                styles.durationText,
                { color: theme.colors.textPrimary },
                duration === option && { color: theme.colors.textInverse },
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  typeGrid: {
    gap: 12,
    marginBottom: 20,
  },
  typeCard: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  typeDescriptionSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  durationSection: {
    marginTop: 16,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
