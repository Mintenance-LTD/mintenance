/**
 * Property filter chips for the jobs list.
 *
 * Rendered only when the account's jobs span 2+ properties — the moment
 * "Leaky Tap/Pipe" stops identifying a job on its own. Single-house accounts
 * never see this row. Sibling of JobsFilterTabs, split out per the screen's
 * existing decomposition (and the 500-line file cap).
 */

import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export interface JobPropertyOption {
  id: string;
  label: string;
}

interface Props {
  /** Distinct properties across the loaded jobs. */
  properties: JobPropertyOption[];
  /** Selected property id, or 'all'. */
  selected: string;
  onSelect: (propertyId: string) => void;
}

export const JobsPropertyChips: React.FC<Props> = ({
  properties,
  selected,
  onSelect,
}) => {
  if (properties.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chips}
      contentContainerStyle={styles.chipsContent}
    >
      {[{ id: 'all', label: 'All properties' }, ...properties].map((p) => {
        const active = selected === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(p.id)}
            accessibilityRole='button'
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Show jobs for ${p.label}`}
          >
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
              numberOfLines={1}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chips: { flexGrow: 0, marginBottom: 8 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: me.brand, borderColor: me.brand },
  chipText: { fontSize: 13, color: me.ink2 },
  chipTextActive: { color: me.onBrand, fontWeight: '600' },
});
