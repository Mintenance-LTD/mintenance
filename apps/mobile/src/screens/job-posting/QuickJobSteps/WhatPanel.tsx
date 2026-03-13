import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JOB_CATEGORIES } from './types';

const CATEGORY_COLORS: Record<string, { iconColor: string; iconBg: string }> = {
  plumbing:    { iconColor: '#10B981', iconBg: '#D1FAE5' },
  electrical:  { iconColor: '#92400E', iconBg: '#FEF3C7' },
  carpentry:   { iconColor: '#F59E0B', iconBg: '#FEF3C7' },
  painting:    { iconColor: '#3B82F6', iconBg: '#DBEAFE' },
  roofing:     { iconColor: '#059669', iconBg: '#D1FAE5' },
  landscaping: { iconColor: '#10B981', iconBg: '#D1FAE5' },
  hvac:        { iconColor: '#991B1B', iconBg: '#FEE2E2' },
  general:     { iconColor: '#717171', iconBg: '#F7F7F7' },
  cleaning:    { iconColor: '#10B981', iconBg: '#D1FAE5' },
  flooring:    { iconColor: '#10B981', iconBg: '#D1FAE5' },
};

interface Props { selectedCategory: string; onSelect: (id: string) => void; onDone: () => void }

export const WhatPanel: React.FC<Props> = ({ selectedCategory, onSelect, onDone }) => (
  <View style={styles.panel}>
    <Text style={styles.panelTitle}>What type of job do you need?</Text>
    <View style={styles.categoryGrid}>
      {JOB_CATEGORIES.map((cat) => {
        const colors = CATEGORY_COLORS[cat.id] ?? CATEGORY_COLORS.general;
        const isActive = selectedCategory === cat.id;
        return (
          <TouchableOpacity key={cat.id} style={[styles.categoryCard, isActive && styles.categoryCardActive]} onPress={() => onSelect(cat.id)}>
            <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
              <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.iconColor} />
            </View>
            <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        );
      })}
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
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#222222', marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '47%', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 10 },
  categoryCardActive: { backgroundColor: '#F7F7F7' },
  iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 13, fontWeight: '500', color: '#717171', flex: 1 },
  categoryLabelActive: { color: '#10B981', fontWeight: '700' },
  doneButton: { alignSelf: 'flex-end', backgroundColor: '#10B981', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 28, marginTop: 16 },
  doneButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
