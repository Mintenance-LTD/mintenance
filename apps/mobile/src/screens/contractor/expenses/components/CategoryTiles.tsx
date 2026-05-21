/**
 * CategoryTiles — 4-up category breakdown per redesign-v2 contractor
 * business deck screen 05.
 *
 * Tiles map directly onto the canonical `Expense.category` values:
 *   - Materials → 'materials'
 *   - Fuel & van → 'fuel'
 *   - Tools → 'tools'
 *   - Subs / fees → 'software' + 'insurance' + 'marketing'
 * "Other" is intentionally absent — the deck shows 4 tiles and the
 * "other" bucket is a fallback that rarely accumulates real spend.
 *
 * Tapping a tile filters the recent list. Selected tile gets the
 * mint pastel + border treatment.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import type { CategoryFilter } from '../types';

interface Props {
  totals: Record<string, number>;
  formatCurrency: (n: number) => string;
  selected: CategoryFilter;
  onSelect: (filter: CategoryFilter) => void;
}

interface TileSpec {
  key: 'materials' | 'fuel' | 'tools' | 'subsFees';
  filter: CategoryFilter;
  matchKeys: readonly string[];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  fg: string;
}

const TILES: readonly TileSpec[] = [
  {
    key: 'materials',
    filter: 'materials',
    matchKeys: ['materials'],
    label: 'Materials',
    icon: 'cube-outline',
    tint: me.infoBg,
    fg: me.infoFg,
  },
  {
    key: 'fuel',
    filter: 'fuel',
    matchKeys: ['fuel'],
    label: 'Fuel & van',
    icon: 'car-outline',
    tint: me.errBg,
    fg: me.errFg,
  },
  {
    key: 'tools',
    filter: 'tools',
    matchKeys: ['tools'],
    label: 'Tools',
    icon: 'construct-outline',
    tint: me.brandSoft,
    fg: me.brand,
  },
  {
    key: 'subsFees',
    // The combined bucket has no canonical single filter. Tap routes
    // to 'software' (the highest-leverage of the three) — a true
    // multi-select would need new state on the screen.
    filter: 'software',
    matchKeys: ['software', 'insurance', 'marketing'],
    label: 'Subs / fees',
    icon: 'document-outline',
    tint: me.bg3,
    fg: me.ink2,
  },
];

const sumOf = (
  totals: Record<string, number>,
  keys: readonly string[]
): number => keys.reduce((sum, k) => sum + (totals[k] ?? 0), 0);

export const CategoryTiles: React.FC<Props> = ({
  totals,
  formatCurrency,
  selected,
  onSelect,
}) => (
  <View style={styles.wrap}>
    <Text style={styles.sectionEyebrow}>By category</Text>
    <View style={styles.grid}>
      {TILES.map((t) => {
        const total = sumOf(totals, t.matchKeys);
        const active = selected === t.filter;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tile, active && styles.tileActive]}
            onPress={() => onSelect(active ? 'all' : t.filter)}
            accessibilityRole='button'
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.iconWrap, { backgroundColor: t.tint }]}>
              <Ionicons name={t.icon} size={18} color={t.fg} />
            </View>
            <Text style={styles.label}>{t.label}</Text>
            <Text style={styles.amount}>{formatCurrency(total)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: me.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  tileActive: {
    borderColor: me.brand,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  amount: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginTop: 2,
  },
});

export default CategoryTiles;
