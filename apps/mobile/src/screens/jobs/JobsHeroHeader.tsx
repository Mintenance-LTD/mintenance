import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
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
  return (
    <LinearGradient
      colors={['#064E3B', '#059669', '#10B981']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insetTop + 12 }]}
    >
      {/* Decorative circles */}
      <View style={styles.decor1} />
      <View style={styles.decor2} />

      {/* Top nav row */}
      <View style={styles.heroNav}>
        <View>
          <Text style={styles.heroTitle}>
            {isContractor ? 'Job Marketplace' : 'My Jobs'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isContractor
              ? `${stats.newToday > 0 ? `${stats.newToday} new today \u00B7 ` : ''}${stats.total} jobs available`
              : `${stats.total} ${stats.total === 1 ? 'job' : 'jobs'} \u00B7 ${stats.activeCount} active`
            }
          </Text>
        </View>
        {!isContractor && (
          <TouchableOpacity
            style={styles.heroAddBtn}
            onPress={onAddJob}
            accessibilityRole="button"
            accessibilityLabel="Post a new job"
          >
            <Ionicons name="add" size={22} color="#064E3B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar inside hero */}
      <View style={styles.heroSearchRow}>
        <View style={styles.heroSearchContainer}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={styles.heroSearchInput}
            placeholder={isContractor ? 'Search by trade, location...' : 'Search your jobs...'}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={onSearchChange}
            accessibilityLabel="Search jobs"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stat pills */}
      <View style={styles.statRow}>
        {isContractor ? (
          <>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Near You</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>
                {stats.avgBudget > 0 ? `\u00A3${stats.avgBudget >= 1000 ? `${(stats.avgBudget / 1000).toFixed(1)}k` : stats.avgBudget}` : '\u2014'}
              </Text>
              <Text style={styles.statLabel}>Avg Budget</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.newToday}</Text>
              <Text style={styles.statLabel}>New Today</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.activeCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.totalBids}</Text>
              <Text style={styles.statLabel}>Bids</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{stats.completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decor2: {
    position: 'absolute',
    bottom: -20,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textInverse,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  heroAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSearchRow: {
    marginBottom: 16,
  },
  heroSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textInverse,
    marginLeft: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textInverse,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    fontWeight: '500',
  },
});
