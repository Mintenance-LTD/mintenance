import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/JobService';
import { Job } from '@mintenance/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageCarousel } from '../components/ui/ImageCarousel';
import { ResponsiveContainer } from '../components/responsive';
import { ExploreMapScreen } from './explore-map/ExploreMapScreen';
import { theme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

type SortMode = 'for_you' | 'nearest' | 'highest_pay' | 'newest' | 'map';
type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';

const SORT_TABS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'for_you', label: 'For You', icon: 'sparkles' },
  { key: 'nearest', label: 'Nearest', icon: 'navigate' },
  { key: 'highest_pay', label: 'Top Pay', icon: 'trending-up' },
  { key: 'newest', label: 'Newest', icon: 'time' },
  { key: 'map', label: 'Map', icon: 'map' },
];

const HOMEOWNER_TABS: { key: FilterStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'posted', label: 'Posted', icon: 'megaphone-outline' },
  { key: 'assigned', label: 'Assigned', icon: 'person-add-outline' },
  { key: 'in_progress', label: 'Active', icon: 'hammer-outline' },
  { key: 'completed', label: 'Done', icon: 'checkmark-circle-outline' },
];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  roofing: 'home-outline',
  painting: 'color-palette-outline',
  carpentry: 'hammer-outline',
  landscaping: 'leaf-outline',
  cleaning: 'sparkles-outline',
  hvac: 'thermometer-outline',
  general: 'construct-outline',
};

const CATEGORY_COLORS: Record<string, { icon: string; bg: string; text: string }> = {
  plumbing:    { icon: theme.colors.primary, bg: theme.colors.primaryLight, text: theme.colors.primary },
  electrical:  { icon: theme.colors.accent, bg: theme.colors.accentLight, text: theme.colors.accent },
  roofing:     { icon: theme.colors.primary, bg: theme.colors.primaryLight, text: theme.colors.primary },
  painting:    { icon: '#3B82F6', bg: '#DBEAFE', text: '#3B82F6' },
  carpentry:   { icon: theme.colors.accent, bg: theme.colors.accentLight, text: theme.colors.accent },
  cleaning:    { icon: '#3B82F6', bg: '#DBEAFE', text: '#3B82F6' },
  hvac:        { icon: theme.colors.error, bg: '#FEE2E2', text: theme.colors.error },
  landscaping: { icon: theme.colors.primary, bg: theme.colors.primaryLight, text: theme.colors.primary },
  general:     { icon: theme.colors.textSecondary, bg: theme.colors.backgroundSecondary, text: theme.colors.textSecondary },
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  posted:      { label: 'Posted', bg: theme.colors.accentLight, text: theme.colors.accent, icon: 'megaphone' },
  assigned:    { label: 'Assigned', bg: '#DBEAFE', text: '#3B82F6', icon: 'person-add' },
  in_progress: { label: 'In Progress', bg: theme.colors.primaryLight, text: theme.colors.primary, icon: 'hammer' },
  completed:   { label: 'Completed', bg: theme.colors.backgroundTertiary, text: theme.colors.textSecondary, icon: 'checkmark-circle' },
};

const EMPTY_MESSAGES: Record<FilterStatus, { title: string; desc: string }> = {
  all:         { title: 'No Jobs Yet', desc: 'Post your first maintenance job to get started.' },
  posted:      { title: 'No Posted Jobs', desc: 'When you post a job, it will appear here waiting for bids.' },
  assigned:    { title: 'No Assigned Jobs', desc: 'Jobs will appear here once you accept a contractor\'s bid.' },
  in_progress: { title: 'No Active Jobs', desc: 'Jobs currently being worked on will show up here.' },
  completed:   { title: 'No Completed Jobs', desc: 'Finished jobs and their reviews will appear here.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS DOTS — Shows job lifecycle stage
// ─────────────────────────────────────────────────────────────────────────────

const LIFECYCLE_STEPS = ['posted', 'assigned', 'in_progress', 'completed'];

const ProgressDots: React.FC<{ status: string }> = ({ status }) => {
  const currentIndex = LIFECYCLE_STEPS.indexOf(status);
  return (
    <View style={styles.progressDots}>
      {LIFECYCLE_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <View style={[
            styles.progressDot,
            i <= currentIndex ? styles.progressDotActive : styles.progressDotInactive,
          ]} />
          {i < LIFECYCLE_STEPS.length - 1 && (
            <View style={[
              styles.progressLine,
              i < currentIndex ? styles.progressLineActive : styles.progressLineInactive,
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const JobsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<JobsStackParamList>>();
  const queryClient = useQueryClient();

  const [sortMode, setSortMode] = useState<SortMode>('for_you');
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  const isContractor = user?.role === 'contractor';

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    AsyncStorage.getItem('saved_jobs').then((v) => {
      if (v) setSavedJobIds(new Set(JSON.parse(v) as string[]));
    }).catch(() => {});
  }, []);

  const toggleSave = useCallback(async (jobId: string) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      AsyncStorage.setItem('saved_jobs', JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const {
    data: allJobs = [],
    isError,
    error: queryError,
    isFetching,
    refetch,
  } = useQuery<Job[]>({
    queryKey: ['jobs', user?.id, user?.role],
    queryFn: async () => {
      if (user!.role === 'homeowner') {
        return JobService.getJobsByHomeowner(user!.id);
      }
      return JobService.getJobsByUser(user!.id, 'contractor');
    },
    enabled: !!user,
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    let newToday = 0;
    let totalBudget = 0;
    let budgetCount = 0;
    let activeCount = 0;
    let totalBids = 0;
    let completedCount = 0;
    let postedCount = 0;

    allJobs.forEach((j) => {
      const age = (now - new Date(j.created_at || j.createdAt || now).getTime()) / (1000 * 3600 * 24);
      if (age < 1) newToday++;
      const b = j.budget || j.budget_min || 0;
      if (b > 0) { totalBudget += b; budgetCount++; }

      // Homeowner stats
      if (j.status === 'in_progress') activeCount++;
      if (j.status === 'completed') completedCount++;
      if (j.status === 'posted') postedCount++;
      if (j.bids) totalBids += j.bids.length;
    });

    return {
      total: allJobs.length,
      newToday,
      avgBudget: budgetCount > 0 ? Math.round(totalBudget / budgetCount) : 0,
      activeCount,
      totalBids,
      completedCount,
      postedCount,
    };
  }, [allJobs]);

  // ── Filter counts (homeowner) ─────────────────────────────────────────────
  const filterCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = { all: allJobs.length, posted: 0, assigned: 0, in_progress: 0, completed: 0 };
    allJobs.forEach((j) => { const s = j.status as FilterStatus; if (s in counts) counts[s]++; });
    return counts;
  }, [allJobs]);

  // ── Sort & filter ─────────────────────────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let data = [...allJobs];

    // Homeowner status filter
    if (!isContractor && selectedFilter !== 'all') {
      data = data.filter((j) => j.status === selectedFilter);
    }

    // Text search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      data = data.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          (typeof j.location === 'string' && j.location.toLowerCase().includes(q))
      );
    }

    // Contractor sort modes
    if (isContractor) {
      switch (sortMode) {
        case 'highest_pay':
          data.sort((a, b) => (b.budget || b.budget_min || 0) - (a.budget || a.budget_min || 0));
          break;
        case 'newest':
          data.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
          break;
        case 'for_you':
        case 'nearest':
        default:
          data.sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
          break;
      }
    } else {
      // Homeowner: sort active first, then newest
      data.sort((a, b) => {
        const statusOrder: Record<string, number> = { in_progress: 0, assigned: 1, posted: 2, completed: 3 };
        const aOrder = statusOrder[a.status] ?? 4;
        const bOrder = statusOrder[b.status] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime();
      });
    }

    return data;
  }, [allJobs, selectedFilter, debouncedQuery, sortMode, isContractor]);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs', user?.id, user?.role] });
  };

  // ── Map view ──────────────────────────────────────────────────────────────
  if (sortMode === 'map' && isContractor) {
    return <ExploreMapScreen onBackToList={() => setSortMode('for_you')} />;
  }

  // ── Render job card ───────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: Job }) => (
    <JobCard
      item={item}
      saved={savedJobIds.has(item.id)}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
      onSave={() => toggleSave(item.id)}
      onBid={() => navigation.navigate('BidSubmission', { jobId: item.id })}
      bidCount={item.bids?.length}
      isContractor={isContractor}
    />
  ), [navigation, savedJobIds, toggleSave, isContractor]);

  // ── Header component (rendered inside FlatList) ───────────────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* Full-Bleed Gradient Hero */}
      <LinearGradient
        colors={['#064E3B', '#059669', '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
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
                ? `${stats.newToday > 0 ? `${stats.newToday} new today · ` : ''}${stats.total} jobs available`
                : `${stats.total} ${stats.total === 1 ? 'job' : 'jobs'} · ${stats.activeCount} active`
              }
            </Text>
          </View>
          {!isContractor && (
            <TouchableOpacity
              style={styles.heroAddBtn}
              onPress={() => navigation.getParent?.()?.navigate('Modal', { screen: 'ServiceRequest' })}
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
              onChangeText={setSearchQuery}
              accessibilityLabel="Search jobs"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                  {stats.avgBudget > 0 ? `£${stats.avgBudget >= 1000 ? `${(stats.avgBudget / 1000).toFixed(1)}k` : stats.avgBudget}` : '—'}
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

      {/* Error banner */}
      {isError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>
            {queryError instanceof Error ? queryError.message : 'Failed to load jobs'}
          </Text>
          <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.retryLinkText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort/Filter tabs */}
      <View style={styles.tabContainer}>
        {isContractor ? (
          <View style={styles.tabRow}>
            {SORT_TABS.map((tab) => {
              const active = sortMode === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sortTab, active && styles.sortTabActive]}
                  onPress={() => setSortMode(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.sortTabText, active && styles.sortTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.tabRow}>
            {HOMEOWNER_TABS.map((tab) => {
              const active = selectedFilter === tab.key;
              const count = filterCounts[tab.key];
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.sortTab, active && styles.sortTabActive]}
                  onPress={() => setSelectedFilter(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? theme.colors.textInverse : theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.sortTabText, active && styles.sortTabTextActive]}>
                    {tab.label}
                  </Text>
                  {count > 0 && tab.key !== 'all' && (
                    <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                      <Text style={[styles.countBadgeText, active && styles.countBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
          {debouncedQuery ? ` for "${debouncedQuery}"` : ''}
        </Text>
      </View>
    </View>
  ), [insets.top, isContractor, stats, searchQuery, sortMode, selectedFilter, isError, queryError, filteredJobs.length, debouncedQuery, filterCounts, navigation, refetch]);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <ResponsiveContainer
        maxWidth={{ mobile: undefined, tablet: 768, desktop: 1200 }}
        padding={{ mobile: 0, tablet: 16, desktop: 24 }}
        style={styles.container}
        testID="jobs-screen"
      >
        <FlatList
          data={filteredJobs}
          renderItem={renderItem}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={() => {
            const emptyMsg = !isContractor
              ? EMPTY_MESSAGES[selectedFilter]
              : EMPTY_MESSAGES.all;
            return (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons
                    name={
                      !isContractor && selectedFilter !== 'all'
                        ? (HOMEOWNER_TABS.find((t) => t.key === selectedFilter)?.icon ?? 'search-outline')
                        : 'search-outline'
                    }
                    size={32}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>{emptyMsg.title}</Text>
                <Text style={styles.emptyDescription}>{emptyMsg.desc}</Text>
                {isContractor && (
                  <View style={styles.emptySuggestions}>
                    <TouchableOpacity style={styles.emptySuggestionRow} onPress={() => setSearchQuery('')}>
                      <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.emptySuggestionText}>Clear search filters</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.emptySuggestionRow} onPress={() => setSortMode('newest')}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.emptySuggestionText}>Browse newest jobs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.emptySuggestionRow} onPress={() => setSortMode('map')}>
                      <Ionicons name="map-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.emptySuggestionText}>Explore jobs on map</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {!isContractor && (
                  <TouchableOpacity
                    style={styles.emptyCtaBtn}
                    onPress={() => navigation.getParent?.()?.navigate('Modal', { screen: 'ServiceRequest' })}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={theme.colors.textInverse} />
                    <Text style={styles.emptyCtaText}>Post a Job</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} progressViewOffset={120} />
          }
          showsVerticalScrollIndicator={false}
        />
      </ResponsiveContainer>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET-FIRST JOB CARD (with homeowner enhancements)
// ─────────────────────────────────────────────────────────────────────────────

const JobCard: React.FC<{
  item: Job;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
  onBid: () => void;
  bidCount?: number;
  isContractor?: boolean;
}> = ({ item, saved, onPress, onSave, onBid, bidCount, isContractor }) => {
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.created_at || item.createdAt || Date.now()).getTime()) / (1000 * 3600 * 24)
  );
  const photos = item.photos || item.images || [];
  const hasPhotos = photos.length > 0;

  const rawLocation = typeof item.location === 'string' ? item.location : item.city || '';
  const locationStr = item.city || rawLocation.split(',').slice(-2, -1)[0]?.trim() || rawLocation;

  const budget = item.budget || item.budget_min || 0;
  const budgetMax = item.budget_max || 0;
  const urgency = item.urgency || item.priority || 'medium';
  const isUrgent = urgency === 'high' || urgency === 'emergency';
  const catKey = item.category?.toLowerCase() || 'general';
  const catColor = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.general;
  const categoryIcon = CATEGORY_ICONS[catKey] || 'construct-outline';
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`;
  const statusStyle = STATUS_STYLES[item.status];

  const contractorName = (item as unknown as Record<string, unknown>).contractor_name as string | undefined;

  const formatBudget = (amt: number) => {
    if (amt >= 1000) return `£${(amt / 1000).toFixed(amt % 1000 === 0 ? 0 : 1)}k`;
    return `£${amt.toLocaleString()}`;
  };

  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${budget > 0 ? `£${budget.toLocaleString()}` : 'Budget TBD'}, ${locationStr}`}
      accessibilityHint="Double tap to view job details"
    >
      {/* Photo hero or category placeholder */}
      {hasPhotos ? (
        <View style={styles.heroSection}>
          <ImageCarousel
            images={photos}
            height={140}
            width={SCREEN_WIDTH - 32}
            showDots={photos.length > 1}
            gradientOverlay
            overlayContent={
              <View style={styles.overlayRow}>
                {isUrgent && (
                  <View style={styles.urgentTag}>
                    <Ionicons name="flame" size={11} color={theme.colors.textInverse} />
                    <Text style={styles.urgentTagText}>Urgent</Text>
                  </View>
                )}
              </View>
            }
          />
        </View>
      ) : (
        <View style={[styles.placeholderHero, { backgroundColor: catColor.bg }]}>
          <Ionicons name={categoryIcon} size={36} color={catColor.icon} style={{ opacity: 0.5 }} />
          {isUrgent && (
            <View style={styles.placeholderUrgent}>
              <Ionicons name="flame" size={11} color={theme.colors.textInverse} />
              <Text style={styles.urgentTagText}>Urgent</Text>
            </View>
          )}
        </View>
      )}

      {/* Save button overlay */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={(e) => { e.stopPropagation?.(); onSave(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save job'}
      >
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? theme.colors.error : theme.colors.textInverse} />
      </TouchableOpacity>

      {/* Status badge — homeowner only */}
      {!isContractor && statusStyle && (
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon} size={11} color={statusStyle.text} />
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      )}

      {/* Card content — BUDGET FIRST */}
      <View style={styles.cardContent}>
        {/* Budget — large and prominent */}
        <Text style={styles.budgetText}>
          {budget > 0
            ? budgetMax > 0 && budgetMax !== budget
              ? `${formatBudget(budget)} – ${formatBudget(budgetMax)}`
              : `£${budget.toLocaleString()}`
            : 'Budget TBD'}
        </Text>

        {/* Title */}
        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>

        {/* Meta row: location · time */}
        <View style={styles.cardMeta}>
          {locationStr ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{locationStr}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{timeLabel}</Text>
          </View>
        </View>

        {/* Tags row: category + bid pressure */}
        <View style={styles.tagsRow}>
          <View style={[styles.categoryTag, { backgroundColor: catColor.bg }]}>
            <Ionicons name={categoryIcon} size={12} color={catColor.text} />
            <Text style={[styles.categoryTagText, { color: catColor.text }]}>
              {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'General'}
            </Text>
          </View>
          {!!bidCount && bidCount > 0 && (
            <View style={styles.bidBadge}>
              <Ionicons name="people-outline" size={12} color={theme.colors.accent} />
              <Text style={styles.bidBadgeText}>
                {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
              </Text>
            </View>
          )}
          {item.status === 'posted' && daysAgo === 0 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          )}
        </View>

        {/* Homeowner: Progress dots for assigned/in-progress jobs */}
        {!isContractor && (item.status === 'assigned' || item.status === 'in_progress') && (
          <View style={styles.progressSection}>
            <ProgressDots status={item.status} />
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>Posted</Text>
              <Text style={styles.progressLabelText}>Assigned</Text>
              <Text style={styles.progressLabelText}>Active</Text>
              <Text style={styles.progressLabelText}>Done</Text>
            </View>
          </View>
        )}

        {/* Homeowner: Assigned contractor info */}
        {!isContractor && contractorName && (item.status === 'assigned' || item.status === 'in_progress') && (
          <View style={styles.contractorRow}>
            <View style={styles.contractorAvatar}>
              <Text style={styles.contractorInitial}>
                {contractorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contractorName}>{contractorName}</Text>
              <Text style={styles.contractorRole}>Assigned Contractor</Text>
            </View>
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
          </View>
        )}

        {/* Homeowner: "View Bids" CTA for posted jobs */}
        {!isContractor && item.status === 'posted' && !!bidCount && bidCount > 0 && (
          <TouchableOpacity
            style={styles.viewBidsBtn}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={16} color={theme.colors.textInverse} />
            <Text style={styles.viewBidsText}>
              View {bidCount} {bidCount === 1 ? 'Bid' : 'Bids'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Contractor: Quick Bid button — posted jobs only */}
        {isContractor && item.status === 'posted' && (
          <TouchableOpacity
            style={styles.quickBidBtn}
            onPress={(e) => { e.stopPropagation?.(); onBid(); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Quick bid on ${item.title}`}
          >
            <Ionicons name="flash" size={16} color={theme.colors.textInverse} />
            <Text style={styles.quickBidText}>Quick Bid</Text>
            {budget > 0 && (
              <Text style={styles.quickBidAmount}>· £{budget.toLocaleString()}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  container: { flex: 1 },

  // ── Hero ───────────────────────────────────────────────────────────────────
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

  // ── Hero search ────────────────────────────────────────────────────────────
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

  // ── Stat pills ─────────────────────────────────────────────────────────────
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

  // ── Sort tabs ──────────────────────────────────────────────────────────────
  tabContainer: {
    backgroundColor: theme.colors.surface,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  sortTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  sortTabActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  sortTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  sortTabTextActive: {
    color: theme.colors.textInverse,
  },
  countBadge: {
    marginLeft: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  countBadgeTextActive: {
    color: theme.colors.textInverse,
  },

  // ── Results row ────────────────────────────────────────────────────────────
  resultsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resultsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: theme.colors.error },
  retryLinkText: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },

  // ── List ───────────────────────────────────────────────────────────────────
  listContainer: { paddingBottom: 24 },

  // ── Job Card ───────────────────────────────────────────────────────────────
  jobCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  heroSection: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  placeholderHero: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderUrgent: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  overlayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  urgentTagText: { fontSize: 11, fontWeight: '700', color: theme.colors.textInverse },

  saveButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },

  // Status badge (homeowner)
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  cardContent: { padding: 16 },

  // Budget-first
  budgetText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  cardMeta: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },

  // Tags
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  categoryTagText: { fontSize: 12, fontWeight: '600' },
  bidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bidBadgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.accent },
  newBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  newBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },

  // ── Progress dots (homeowner) ──────────────────────────────────────────────
  progressSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
  },
  progressDotInactive: {
    backgroundColor: '#E0E0E0',
  },
  progressLine: {
    flex: 1,
    height: 2,
  },
  progressLineActive: {
    backgroundColor: theme.colors.primary,
  },
  progressLineInactive: {
    backgroundColor: '#E0E0E0',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabelText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },

  // ── Contractor info row (homeowner) ────────────────────────────────────────
  contractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
  },
  contractorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contractorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contractorRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },

  // ── View Bids CTA (homeowner) ──────────────────────────────────────────────
  viewBidsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  viewBidsText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },

  // Quick Bid (contractor)
  quickBidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  quickBidText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  quickBidAmount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center' },
  emptyDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginTop: 8,
  },
  emptySuggestions: {
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  emptySuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  emptySuggestionText: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: theme.colors.textInverse },
});

export default JobsScreen;
