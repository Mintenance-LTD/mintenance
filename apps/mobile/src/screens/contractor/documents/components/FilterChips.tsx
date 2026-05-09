import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../theme';
import { styles } from '../../DocumentsStyles';
import { FILTER_CONFIG, type DocFilter } from '../types';

/**
 * Horizontal scrolling filter chips with icon + label + count badge.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44d).
 */
export function FilterChips({
  filter,
  filterCounts,
  onChange,
}: {
  filter: DocFilter;
  filterCounts: Record<string, number>;
  onChange: (filter: DocFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {FILTER_CONFIG.map((f) => {
        const active = filter === f.key;
        const count = filterCounts[f.key] || 0;
        return (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onChange(f.key)}
            accessibilityRole='button'
            accessibilityState={{ selected: active }}
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={
                active ? theme.colors.textInverse : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
            {count > 0 && f.key !== 'all' && (
              <View
                style={[styles.chipBadge, active && styles.chipBadgeActive]}
              >
                <Text
                  style={[
                    styles.chipBadgeText,
                    active && styles.chipBadgeTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
