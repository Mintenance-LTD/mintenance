import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { JOB_CATEGORIES } from './types';

const CATEGORY_COLORS: Record<string, { iconColor: string; iconBg: string }> = {
  plumbing:    { iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight },
  electrical:  { iconColor: theme.colors.warningDark, iconBg: theme.colors.accentLight },
  carpentry:   { iconColor: theme.colors.warning, iconBg: theme.colors.accentLight },
  painting:    { iconColor: theme.colors.info, iconBg: theme.colors.backgroundSecondary },
  roofing:     { iconColor: theme.colors.primaryDark, iconBg: theme.colors.primaryLight },
  landscaping: { iconColor: theme.colors.success, iconBg: theme.colors.primaryLight },
  hvac:        { iconColor: theme.colors.errorDark, iconBg: theme.colors.accentLight },
  general:     { iconColor: theme.colors.textSecondary, iconBg: theme.colors.backgroundSecondary },
  cleaning:    { iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight },
  flooring:    { iconColor: theme.colors.primary, iconBg: theme.colors.primaryLight },
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
  panelTitle: { fontSize: 16, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '47%', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, gap: 10 },
  categoryCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.backgroundSecondary },
  iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 13, fontWeight: theme.typography.fontWeight.medium, color: theme.colors.textSecondary, flex: 1 },
  categoryLabelActive: { color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.bold },
  doneButton: { alignSelf: 'flex-end', backgroundColor: theme.colors.textPrimary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, marginTop: 16 },
  doneButtonText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: theme.typography.fontWeight.semibold },
});
