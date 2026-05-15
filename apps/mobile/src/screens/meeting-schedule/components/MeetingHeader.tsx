/**
 * MeetingHeader Component
 *
 * Header with contractor and job information.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Header display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import type { User, Job } from '@mintenance/types';

interface MeetingHeaderProps {
  contractor?: User;
  job?: Job;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({
  contractor,
  job,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: me.surface }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name='calendar-outline' size={20} color='#3B82F6' />
        </View>
        <Text style={[styles.title, { color: me.ink }]}>Schedule Meeting</Text>
      </View>

      {contractor && (
        <View style={styles.infoRow}>
          <View style={[styles.infoIconWrap, { backgroundColor: me.bg2 }]}>
            <Ionicons name='person-outline' size={14} color={me.ink2} />
          </View>
          <Text style={[styles.infoText, { color: me.ink2 }]}>
            With: {contractor.first_name} {contractor.last_name}
          </Text>
        </View>
      )}

      {job && (
        <View style={styles.infoRow}>
          <View style={[styles.infoIconWrap, { backgroundColor: me.bg2 }]}>
            <Ionicons name='briefcase-outline' size={14} color={me.ink2} />
          </View>
          <Text style={[styles.infoText, { color: me.ink2 }]}>
            Job: {job.title}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 16,
    ...me.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
  },
});
