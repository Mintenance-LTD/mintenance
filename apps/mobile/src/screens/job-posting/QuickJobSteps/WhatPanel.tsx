import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JOB_CATEGORIES } from './types';

interface Props { selectedCategory: string; onSelect: (id: string) => void; onDone: () => void }

export const WhatPanel: React.FC<Props> = ({ selectedCategory, onSelect, onDone }) => (
  <View style={styles.panel}>
    <Text style={styles.panelTitle}>What type of job do you need?</Text>
    <View style={styles.categoryGrid}>
      {JOB_CATEGORIES.map((cat) => (
        <TouchableOpacity key={cat.id} style={[styles.categoryCard, selectedCategory === cat.id && styles.categoryCardActive]} onPress={() => onSelect(cat.id)}>
          <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={28} color={selectedCategory === cat.id ? '#222222' : '#6B7280'} />
          <Text style={[styles.categoryLabel, selectedCategory === cat.id && styles.categoryLabelActive]}>{cat.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
    {selectedCategory && (
      <TouchableOpacity style={styles.doneButton} onPress={onDone}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  panel: { paddingTop: 20 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '47%', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', gap: 10 },
  categoryCardActive: { borderColor: '#222222', backgroundColor: '#F7F7F7' },
  categoryLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', flex: 1 },
  categoryLabelActive: { color: '#222222', fontWeight: '700' },
  doneButton: { alignSelf: 'flex-end', backgroundColor: '#111827', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, marginTop: 16 },
  doneButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});