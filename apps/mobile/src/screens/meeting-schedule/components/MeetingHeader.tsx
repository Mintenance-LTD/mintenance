/**
 * MeetingHeader Component
 *
 * Header with contractor and job information.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Header display
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User, Job } from '@mintenance/types';

interface MeetingHeaderProps {
  contractor?: User;
  job?: Job;
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({ contractor, job }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
        </View>
        <Text style={styles.title}>Schedule Meeting</Text>
      </View>

      {contractor && (
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="person-outline" size={14} color="#717171" />
          </View>
          <Text style={styles.infoText}>With: {contractor.first_name} {contractor.last_name}</Text>
        </View>
      )}

      {job && (
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="briefcase-outline" size={14} color="#717171" />
          </View>
          <Text style={styles.infoText}>Job: {job.title}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
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
    color: '#222222',
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
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#717171',
  },
});
