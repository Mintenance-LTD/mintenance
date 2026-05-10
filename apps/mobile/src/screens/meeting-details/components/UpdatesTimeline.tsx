import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MeetingUpdate } from '@mintenance/types';
import { theme } from '../../../theme';
import { styles } from '../../meetingDetailsStyles';
import { formatUpdateTime } from '../utils';

/**
 * Vertical timeline of meeting updates.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */
export function UpdatesTimeline({ updates }: { updates: MeetingUpdate[] }) {
  if (updates.length === 0) return null;

  return (
    <View style={styles.updatesSection}>
      <Text style={styles.sectionTitle}>Updates</Text>
      {updates.map((update) => (
        <View key={update.id} style={styles.updateItem}>
          <View style={styles.updateIcon}>
            <Ionicons
              name={iconForUpdate(update.updateType)}
              size={16}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.updateContent}>
            <Text style={styles.updateMessage}>{update.message}</Text>
            <Text style={styles.updateTime}>
              {formatUpdateTime(update.timestamp)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function iconForUpdate(
  updateType: MeetingUpdate['updateType']
): 'calendar' | 'location' | 'checkmark-circle' | 'notifications' {
  switch (updateType) {
    case 'rescheduled':
      return 'calendar';
    case 'location_update':
      return 'location';
    case 'status_change':
      return 'checkmark-circle';
    default:
      return 'notifications';
  }
}
