/**
 * JobsHeroHeader — Mint Editorial v2 (2026-05-23 redesign).
 *
 * Replaces the prior heavy header (36pt mixed-weight title + gradient
 * stat card + 3-up bento row of "LOCAL LISTINGS / £AVG / FRESH MATCHES"
 * for contractors, "ACTIVE / TOTAL BIDS / COMPLETED" for homeowners).
 *
 * The mockup (redesign-v2 contractor "Discover" + homeowner "Jobs")
 * shows a single calm editorial header: caption eyebrow + serif title
 * + one-line subtitle that surfaces the only number that matters
 * ("Discover N opportunities", "N jobs · M active"). Stat bento is
 * cut entirely — the active/completed/bids counts are surfaced by
 * the filter chips below (which the consumer screen already shows
 * in the row of `All Jobs / Active / Completed` pills).
 *
 * Homeowner-side "+ Add" mint pill stays in the top-right; the search
 * bar stays on a homeowner-only branch since contractors find work via
 * the Discover/Map view, not text search.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
import type { JobStats } from './types';

interface JobsHeroHeaderProps {
  insetTop: number;
  isContractor: boolean;
  stats: JobStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddJob: () => void;
}

export const JobsHeroHeader: React.FC<JobsHeroHeaderProps> = ({
  insetTop,
  isContractor,
  stats,
  searchQuery,
  onSearchChange,
  onAddJob,
}) => {
  const eyebrow = isContractor ? 'Discover' : 'Your projects';
  const title = isContractor ? 'Jobs near you' : 'Jobs';

  // Subtitle: surface the single most actionable number per role.
  const subtitle = isContractor
    ? stats.total > 0
      ? `${stats.total} ${stats.total === 1 ? 'opportunity' : 'opportunities'} tailored to your skills`
      : 'Pull to refresh — new jobs land throughout the day'
    : stats.total > 0
      ? `${stats.total} ${stats.total === 1 ? 'job' : 'jobs'} · ${stats.activeCount} active`
      : 'Post your first job to start receiving bids';

  return (
    <View style={[styles.container, { paddingTop: insetTop + 8 }]}>
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {!isContractor && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={onAddJob}
            accessibilityRole='button'
            accessibilityLabel='Post a new job'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='add' size={22} color={me.onBrand} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search — homeowner only. Contractors discover via map / filter
          chips, not text search, per the mockup. */}
      {!isContractor && (
        <View style={styles.searchBar}>
          <Ionicons
            name='search'
            size={18}
            color={me.ink3}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder='Search your jobs'
            placeholderTextColor={me.ink3}
            value={searchQuery}
            onChangeText={onSearchChange}
            accessibilityLabel='Search jobs'
            returnKeyType='search'
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => onSearchChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole='button'
              accessibilityLabel='Clear search'
            >
              <Ionicons name='close-circle' size={18} color={me.ink3} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: me.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: me.ink3,
    lineHeight: 18,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: me.line,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: me.ink,
    paddingVertical: 0,
  },
});
