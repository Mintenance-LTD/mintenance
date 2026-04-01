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
import { theme, gradients } from '../../theme';
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
    <View style={[styles.container, { paddingTop: insetTop + 12 }]}>
      {/* Editorial header */}
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>
              {isContractor ? 'Curated Marketplace' : 'Your Projects'}
            </Text>
            <Text style={styles.headerTitle}>
              {isContractor ? 'Job ' : 'My '}
              <Text style={styles.headerTitleBold}>
                {isContractor ? 'Marketplace' : 'Jobs'}
              </Text>
            </Text>
            <View style={styles.headerSubtitleRow}>
              <View style={styles.headerAccent} />
              <Text style={styles.headerSubtitle}>
                {isContractor
                  ? `Discover ${stats.total} ${stats.total === 1 ? 'opportunity' : 'opportunities'} tailored to your expertise.`
                  : `${stats.total} ${stats.total === 1 ? 'job' : 'jobs'} \u00B7 ${stats.activeCount} active`}
              </Text>
            </View>
          </View>
          {!isContractor && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={onAddJob}
              accessibilityRole='button'
              accessibilityLabel='Post a new job'
            >
              <Ionicons name='add' size={22} color={theme.colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search bar — homeowner only */}
        {!isContractor && (
          <View style={styles.searchBar}>
            <Ionicons
              name='search'
              size={18}
              color={theme.colors.primary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder='Search your jobs...'
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={onSearchChange}
              accessibilityLabel='Search jobs'
              returnKeyType='search'
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchChange('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name='close-circle'
                  size={18}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Summary stat cards */}
      <View style={styles.statRow}>
        {isContractor ? (
          <>
            <View style={styles.statCard}>
              <Ionicons
                name='navigate'
                size={18}
                color={theme.colors.primary}
                style={styles.statIcon}
              />
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Local Listings</Text>
            </View>
            <LinearGradient
              colors={gradients.heroGreen}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardPrimary}
            >
              <Ionicons
                name='cash'
                size={18}
                color='rgba(255,255,255,0.5)'
                style={styles.statIcon}
              />
              <Text style={styles.statValueWhite}>
                {stats.avgBudget > 0
                  ? `\u00A3${stats.avgBudget >= 1000 ? `${(stats.avgBudget / 1000).toFixed(1)}k` : stats.avgBudget}`
                  : '\u2014'}
              </Text>
              <Text style={styles.statLabelWhite}>Avg Value</Text>
            </LinearGradient>
            <View style={styles.statCard}>
              <Ionicons
                name='sparkles'
                size={18}
                color={theme.colors.accent}
                style={styles.statIcon}
              />
              <Text style={styles.statValue}>
                {stats.newToday > 0 ? stats.newToday : 'Fresh'}
              </Text>
              <Text style={styles.statLabel}>
                {stats.newToday > 0 ? 'New Today' : 'Matches'}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statCard}>
              <Ionicons
                name='flash'
                size={18}
                color={theme.colors.primary}
                style={styles.statIcon}
              />
              <Text style={styles.statValue}>{stats.activeCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <LinearGradient
              colors={gradients.heroGreen}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardPrimary}
            >
              <Ionicons
                name='people'
                size={18}
                color='rgba(255,255,255,0.5)'
                style={styles.statIcon}
              />
              <Text style={styles.statValueWhite}>{stats.totalBids}</Text>
              <Text style={styles.statLabelWhite}>Total Bids</Text>
            </LinearGradient>
            <View style={styles.statCard}>
              <Ionicons
                name='checkmark-circle'
                size={18}
                color={theme.colors.primary}
                style={styles.statIcon}
              />
              <Text style={styles.statValue}>{stats.completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.colors.background,
  },
  // Header
  headerSection: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '300',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerTitleBold: {
    fontWeight: '800',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  headerAccent: {
    width: 2,
    height: 28,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
    marginRight: 12,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  searchButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Stat cards
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  statCardPrimary: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  statValueWhite: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statLabelWhite: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
