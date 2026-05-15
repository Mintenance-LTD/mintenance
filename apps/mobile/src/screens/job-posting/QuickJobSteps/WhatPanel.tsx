import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JOB_CATEGORIES } from './types';
import { me } from '../../../design-system/mint-editorial';

const CATEGORY_COLORS: Record<string, { iconColor: string; iconBg: string }> = {
  plumbing: {
    iconColor: me.brand,
    iconBg: me.brandSoft,
  },
  electrical: { iconColor: me.warnFg, iconBg: me.warnBg },
  carpentry: {
    iconColor: me.accent,
    iconBg: me.warnBg,
  },
  painting: { iconColor: '#3B82F6', iconBg: '#DBEAFE' },
  roofing: {
    iconColor: me.brand2,
    iconBg: me.brandSoft,
  },
  landscaping: {
    iconColor: me.brand,
    iconBg: me.brandSoft,
  },
  hvac: { iconColor: '#991B1B', iconBg: '#FEE2E2' },
  general: {
    iconColor: me.ink2,
    iconBg: me.bg2,
  },
  cleaning: {
    iconColor: me.brand,
    iconBg: me.brandSoft,
  },
  flooring: {
    iconColor: me.brand,
    iconBg: me.brandSoft,
  },
};

interface Props {
  selectedCategory: string;
  onSelect: (id: string) => void;
  onDone: () => void;
}

export const WhatPanel: React.FC<Props> = ({
  selectedCategory,
  onSelect,
  onDone,
}) => (
  <View style={styles.panel}>
    <Text style={styles.panelTitle}>What type of job do you need?</Text>
    <View style={styles.categoryGrid}>
      {JOB_CATEGORIES.map((cat) => {
        const colors = CATEGORY_COLORS[cat.id] ?? CATEGORY_COLORS.general;
        const isActive = selectedCategory === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, isActive && styles.categoryCardActive]}
            onPress={() => onSelect(cat.id)}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: colors?.iconBg ?? me.bg2,
                },
              ]}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={colors?.iconColor ?? me.ink2}
              />
            </View>
            <Text
              style={[
                styles.categoryLabel,
                isActive && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
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
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 16,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: me.surface,
    gap: 10,
  },
  categoryCardActive: { backgroundColor: me.bg2 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: me.ink2,
    flex: 1,
  },
  categoryLabelActive: { color: me.brand, fontWeight: '700' },
  doneButton: {
    alignSelf: 'flex-end',
    backgroundColor: me.brand,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 28,
    marginTop: 16,
  },
  doneButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
});
