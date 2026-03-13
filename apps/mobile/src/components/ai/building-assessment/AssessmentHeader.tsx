import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BuildingAssessment } from './types';

interface Props { assessment: BuildingAssessment; expanded: boolean; onToggle: () => void }

export const AssessmentHeader: React.FC<Props> = ({ assessment, expanded, onToggle }) => (
  <TouchableOpacity style={styles.header} onPress={onToggle}>
    <View style={styles.headerLeft}>
      <Ionicons name='sparkles' size={20} color='#F59E0B' />
      <Text style={styles.title}>AI Building Assessment</Text>
    </View>
    <View style={styles.headerRight}>
      <View style={styles.confidenceBadge}>
        <Text style={styles.confidenceText}>{Math.round(assessment.confidence)}% confidence</Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color='#717171' />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', marginLeft: 8, color: '#222222' },
  confidenceBadge: { backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  confidenceText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
});
