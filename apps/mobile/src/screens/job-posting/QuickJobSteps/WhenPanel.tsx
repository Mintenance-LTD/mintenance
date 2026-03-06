import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { URGENCY_OPTIONS } from './types';

interface Props { selectedUrgency: string; onSelect: (urgency: string) => void }

export const WhenPanel: React.FC<Props> = ({ selectedUrgency, onSelect }) => (
  <View style={styles.panel}>
    <Text style={styles.panelTitle}>When do you need this done?</Text>
    <View style={styles.urgencyGrid}>
      {URGENCY_OPTIONS.map((opt) => (
        <TouchableOpacity key={opt.value} style={[styles.urgencyChip, { backgroundColor: opt.color }, selectedUrgency === opt.value && styles.urgencyChipActive]} onPress={() => onSelect(opt.value)}>
          <Text style={[styles.urgencyText, { color: opt.textColor }]}>{opt.label}</Text>
          {selectedUrgency === opt.value && (
            <Ionicons name='checkmark' size={16} color={opt.textColor} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  panel: { paddingTop: 20 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  urgencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  urgencyChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, gap: 8, minWidth: '46%', flex: 1 },
  urgencyChipActive: { borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)' },
  urgencyText: { fontSize: 15, fontWeight: '600' },
});