import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/JobService';
import { Job } from '@mintenance/types';
import { theme, getStatusColor as themeGetStatusColor } from '../theme';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavigationHeader } from '../components/navigation';
import { ImageCarousel } from '../components/ui/ImageCarousel';
import { ResponsiveContainer } from '../components/responsive';
import { ExploreMapScreen } from './explore-map/ExploreMapScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';
type ViewMode = 'list' | 'map';

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
  plumbing:    { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  electrical:  { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  roofing:     { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  painting:    { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  carpentry:   { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  cleaning:    { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  hvac:        { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  landscaping: { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
  general:     { icon: '#717171', bg: '#F7F7F7', text: '#717171' },
};

const FILTER_LABELS: Record<FilterStatus, string> = {
  all: 'All',
  posted: 'Posted',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Done',
};

const JobsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

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
        // Homeowners see jobs they have posted
        return JobService.getJobsByHomeowner(user!.id);
      }
      // Contractors see only their own active jobs (assigned, in_progress, completed).
      // Available jobs to bid on are shown via the "Find Jobs" map (ExploreMapScreen).
      return JobService.getJobsByUser(user!.id, 'contractor');
    },
    enabled: !!user,
  });

  const filterCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: allJobs.length,
      posted: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
    };
    allJobs.forEach((j) => {
      const s = j.status as FilterStatus;
      if (s in counts) counts[s]++;
    });
    return counts;
  }, [allJobs]);

  const newToday = useMemo(() =>
    allJobs.filter((j) => {
      const age = (Date.now() - new Date(j.created_at || (j as any).createdAt || Date.now()).getTime()) / (1000 * 3600 * 24);
      return age < 1;
    }).length,
  [allJobs]);

  const filteredJobs = useMemo(() => {
    let data = allJobs;
    if (selectedFilter !== 'all') {
      data = data.filter((j) => j.status === selectedFilter);
    }
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      data = data.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          (typeof j.location === 'string' && j.location.toLowerCase().includes(q))
      );
    }
    return data;
  }, [allJobs, selectedFilter, debouncedQuery]);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs', user?.id, user?.role] });
  };

  const renderItem = useCallback(({ item }: { item: Job }) => (
    <JobCard
      item={item}
      saved={savedJobIds.has(item.id)}
      onPress={() => (navigation as any).navigate('JobDetails', { jobId: item.id })}
      onSave={() => toggleSave(item.id)}
      bidCount={item.bids?.length}
    />
  ), [navigation, savedJobIds, toggleSave]);

  const isContractor = user?.role === 'contractor';

  // When map mode is active, render the explore map full-screen
  if (viewMode === 'map' && isContractor) {
    return <ExploreMapScreen onBackToList={() => setViewMode('list')} />;
  }

  // Contractors only have active-job statuses here; available jobs live in Find Jobs (map)
  const contractorFilters: FilterStatus[] = ['all', 'assigned', 'in_progress', 'completed'];
  const homeownerFilters: FilterStatus[] = ['all', 'posted', 'assigned', 'in_progress', 'completed'];
  const visibleFilters = isContractor ? contractorFilters : homeownerFilters;

  const subtitle = newToday > 0
    ? `${newToday} new today · ${filteredJobs.length} total`
    : `${filteredJobs.length} ${user?.role === 'homeowner' ? 'jobs' : 'active jobs'}`;

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      <NavigationHeader
        title={user?.role === 'homeowner' ? 'My Jobs' : 'Job Marketplace'}
        subtitle={subtitle}
        rightIcon={
          user?.role === 'homeowner'
            ? { name: 'add-circle-outline', onPress: () => navigation.getParent?.()?.navigate('Modal', { screen: 'ServiceRequest' }) }
            : undefined
        }
      />

      <ResponsiveContainer
        maxWidth={{ mobile: undefined, tablet: 768, desktop: 1200 }}
        padding={{ mobile: 0, tablet: 16, desktop: 24 }}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        testID="jobs-screen"
      >
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          {isError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>
                {queryError instanceof Error ? queryError.message : 'Failed to load jobs'}
              </Text>
              <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by trade, location..."
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Search jobs"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            {isContractor && (
              <TouchableOpacity
                style={styles.mapToggle}
                onPress={() => setViewMode('map')}
                accessibilityRole="button"
                accessibilityLabel="Switch to map view"
              >
                <Ionicons name="map-outline" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {visibleFilters.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, selectedFilter === key && styles.filterChipActive]}
                onPress={() => setSelectedFilter(key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter: ${FILTER_LABELS[key]} (${filterCounts[key]})`}
                accessibilityState={{ selected: selectedFilter === key }}
              >
                <Text style={[styles.filterChipText, selectedFilter === key && styles.filterChipTextActive]}>
                  {FILTER_LABELS[key]}
                  {filterCounts[key] > 0 && key !== 'all' ? ` ${filterCounts[key]}` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filteredJobs}
          renderItem={renderItem}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Jobs</Text>
              <Text style={styles.emptyDescription}>
                {user?.role === 'homeowner'
                  ? 'Post your first maintenance job'
                  : 'Check back later for new opportunities'}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      </ResponsiveContainer>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT JOB CARD
// ─────────────────────────────────────────────────────────────────────────────

const JobCard: React.FC<{
  item: Job;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
  bidCount?: number;
  hasAIAssessment?: boolean;
}> = ({ item, saved, onPress, onSave, bidCount, hasAIAssessment }) => {
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.created_at || (item as any).createdAt || Date.now()).getTime()) / (1000 * 3600 * 24)
  );
  const photos = item.photos || (item as any).images || [];
  const hasPhotos = photos.length > 0;

  // Show city/town only — strip full address noise
  const rawLocation = typeof item.location === 'string' ? item.location : (item as any).city || '';
  const locationStr = (item as any).city || rawLocation.split(',').slice(-2, -1)[0]?.trim() || rawLocation;

  const budget = item.budget || (item as any).budget_min || 0;
  const urgency = item.urgency || (item as any).priority || 'medium';
  const isUrgent = urgency === 'high' || urgency === 'emergency';
  const catKey = item.category?.toLowerCase() || 'general';
  const catColor = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.general;
  const categoryIcon = CATEGORY_ICONS[catKey] || 'construct-outline';

  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, £${budget.toLocaleString()}, ${locationStr}`}
      accessibilityHint="Double tap to view job details"
    >
      {/* Photo or placeholder – compact 130px height */}
      {hasPhotos ? (
        <View style={styles.heroSection}>
          <ImageCarousel
            images={photos}
            height={130}
            width={SCREEN_WIDTH - 32}
            showDots={photos.length > 1}
            gradientOverlay
            overlayContent={
              <View style={styles.overlayRow}>
                {isUrgent && (
                  <View style={styles.urgentTag}>
                    <Ionicons name="flame" size={11} color="#FFFFFF" />
                    <Text style={styles.urgentTagText}>Urgent</Text>
                  </View>
                )}
                <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusTagText}>{formatStatus(item.status)}</Text>
                </View>
              </View>
            }
          />
        </View>
      ) : (
        <View style={[styles.placeholderHero, { backgroundColor: catColor.bg }]}>
          <Ionicons name={categoryIcon} size={36} color={catColor.icon} />
          <View style={styles.placeholderOverlay}>
            {isUrgent && (
              <View style={styles.urgentTag}>
                <Ionicons name="flame" size={11} color="#FFFFFF" />
                <Text style={styles.urgentTagText}>Urgent</Text>
              </View>
            )}
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusTagText}>{formatStatus(item.status)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Save button – absolute top-right */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={(e) => { e.stopPropagation?.(); onSave(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save job'}
      >
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? '#EF4444' : '#FFFFFF'} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
        </View>

        <View style={styles.cardMeta}>
          {locationStr ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
              <Text style={styles.metaText}>{locationStr}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={theme.colors.textTertiary} />
            <Text style={styles.metaText}>{daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>{budget > 0 ? `£${budget.toLocaleString()}` : 'Budget TBD'}</Text>
          <View style={styles.footerRight}>
            {item.category && (
              <View style={[styles.categoryTag, { backgroundColor: catColor.bg }]}>
                <Text style={[styles.categoryTagText, { color: catColor.text }]}>
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </Text>
              </View>
            )}
            {!!bidCount && bidCount > 0 && (
              <View style={styles.bidBadge}>
                <Ionicons name="people-outline" size={11} color="#EA580C" />
                <Text style={styles.bidBadgeText}>{bidCount}</Text>
              </View>
            )}
            {hasAIAssessment && (
              <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI</Text></View>
            )}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.jobDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const getStatusColor = (status: string) => themeGetStatusColor(status);

const formatStatus = (status: string) => {
  switch (status) {
    case 'posted': return 'Open';
    case 'assigned': return 'Assigned';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Done';
    default: return status;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { backgroundColor: theme.colors.background, paddingBottom: 8 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 44,
    ...theme.shadows.base,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: theme.colors.textPrimary },
  mapToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.base,
  },

  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: { fontSize: 13, color: '#717171', fontWeight: '500' },
  filterChipTextActive: { color: theme.colors.textInverse, fontWeight: '600' },

  listContainer: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

  // Compact Job Card
  jobCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    ...theme.shadows.base,
  },
  heroSection: { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  placeholderHero: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  overlayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  statusTagText: { fontSize: 11, fontWeight: '600', color: theme.colors.white },
  urgentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    gap: 3,
  },
  urgentTagText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  saveButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },

  cardContent: { padding: 12 },
  cardTopRow: { marginBottom: 4 },
  jobTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: theme.colors.textTertiary },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceText: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  categoryTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryTagText: { fontSize: 12, fontWeight: '600' },

  bidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bidBadgeText: { fontSize: 11, fontWeight: '600', color: '#717171' },
  aiBadge: {
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiBadgeText: { fontSize: 11, fontWeight: '600', color: '#717171' },

  jobDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },

  // Empty & Error
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center' },
  emptyDescription: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 280 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: theme.colors.error },
  retryText: { fontSize: 14, fontWeight: '600', color: '#222222' },
});

export default JobsScreen;
