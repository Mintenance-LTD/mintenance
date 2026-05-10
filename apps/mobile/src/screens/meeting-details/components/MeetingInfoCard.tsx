import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ContractorMeeting } from '@mintenance/types';
import { theme } from '../../../theme';
import { styles } from '../../meetingDetailsStyles';
import { formatMeetingTime, getStatusColor } from '../utils';

/**
 * Top info card — meeting type, status badge, scheduled time,
 * participant block, optional notes.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */
export function MeetingInfoCard({ meeting }: { meeting: ContractorMeeting }) {
  return (
    <View style={styles.meetingInfo}>
      <View style={styles.meetingHeader}>
        <View style={styles.meetingTitleContainer}>
          <Text style={styles.meetingTitle}>
            {meeting.meeting_type.replace('_', ' ').toUpperCase()}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(meeting.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {meeting.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.meetingTime}>
          {formatMeetingTime(meeting.scheduled_datetime)}
        </Text>
      </View>

      <View style={styles.participantInfo}>
        <View style={styles.participant}>
          <Ionicons
            name='person-circle'
            size={40}
            color={theme.colors.textSecondary}
          />
          <View>
            <Text style={styles.participantName}>
              {meeting.contractor
                ? `${meeting.contractor.first_name} ${meeting.contractor.last_name}`
                : 'Contractor'}
            </Text>
            <Text style={styles.participantRole}>Contractor</Text>
          </View>
        </View>
      </View>

      {meeting.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>{meeting.notes}</Text>
        </View>
      )}
    </View>
  );
}
