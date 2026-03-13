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
    <View style={styles.container} testID="meeting-type-container">
      <Text style={styles.sectionTitle}>MEETING TYPE</Text>

      <View style={styles.typeGrid}>
        {meetingTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            testID={`meeting-type-${type.id}`}
            style={[
              styles.typeCard,
              selectedType === type.id && styles.typeCardSelected,
            ]}
            onPress={() => {
              onTypeSelect(type.id);
              onDurationChange(type.estimatedDuration);
            }}
          >
            <View style={[styles.typeIcon, selectedType === type.id && styles.typeIconSelected]}>
              <Ionicons
                name={type.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={selectedType === type.id ? '#FFFFFF' : '#717171'}
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
              testID={`duration-${option}`}
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
    backgroundColor: '#FFFFFF',
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
    color: '#B0B0B0',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  typeGrid: {
    gap: 12,
    marginBottom: 20,
  },
  typeCard: {
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  typeCardSelected: {
    backgroundColor: '#222222',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
    color: '#222222',
    marginBottom: 4,
  },
  typeNameSelected: {
    color: '#FFFFFF',
  },
  typeDescription: {
    fontSize: 12,
    color: '#717171',
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
    color: '#222222',
    marginBottom: 12,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationButton: {
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  durationButtonSelected: {
    backgroundColor: '#222222',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  durationTextSelected: {
    color: '#FFFFFF',
  },
});
