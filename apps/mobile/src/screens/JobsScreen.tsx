import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/JobService';
import { Job } from '@mintenance/types';
import { theme, getStatusColor as themeGetStatusColor } from '../theme';
import { NavigationHeader } from '../components/navigation';
import { ImageCarousel } from '../components/ui/ImageCarousel';
import {
  ResponsiveContainer,
} from '../components/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';

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

const JobsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<unknown>();

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;
    try {
      setError(null);
      const jobs =
        user.role === 'homeowner'
          ? await JobService.getJobsByHomeowner(user.id)
          : await JobService.getAvailableJobs();
      setAllJobs(jobs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load jobs';
      setError(message);
    }
  };

  const filteredJobs = useMemo(() => {
    let data = allJobs;
    if (selectedFilter !== 'all') {
      data = data.filter((j) => j.status === selectedFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          (typeof j.location === 'string' && j.location.toLowerCase().includes(q))
      );
    }
    return data;
  }, [allJobs, selectedFilter, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadJobs();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = useCallback(({ item }: { item: Job }) => (
    <JobCard
      item={item}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
    />
  ), [navigation]);

  return (
    <View style={styles.mainContainer}>
      <NavigationHeader
        title={user?.role === 'homeowner' ? 'My Jobs' : 'Job Marketplace'}
        subtitle={`${filteredJobs.length} ${user?.role === 'homeowner' ? 'jobs' : 'opportunities'}`}
        rightIcon={
          user?.role === 'homeowner'
            ? {
                name: 'add-circle-outline',
                onPress: () =>
                  navigation.getParent?.()?.navigate('Modal', {
                    screen: 'ServiceRequest',
                  }),
              }
            : undefined
        }
      />

      <ResponsiveContainer
        maxWidth={{
          mobile: undefined,
          tablet: 768,
          desktop: 1200,
        }}
        padding={{
          mobile: 24,
          tablet: 16,
          desktop: 24,
        }}
        style={styles.container}
        testID="jobs-screen"
      >
        <View style={styles.header}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name='alert-circle' size={18} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => void loadJobs()} accessibilityRole='button' accessibilityLabel='Retry loading jobs'>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {user?.role === 'contractor' && (
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <Ionicons
                  name='search'
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder='Search jobs...'
                  placeholderTextColor={theme.colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  accessibilityLabel='Search jobs'
                  accessibilityHint='Type to search by title, description, or location'
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterRow}>
                  {(
                    ['all', 'posted', 'in_progress', 'completed'] as FilterStatus[]
                  ).map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filterChip,
                        selectedFilter === key && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedFilter(key)}
                      accessibilityRole='button'
                      accessibilityLabel={`Filter by ${key === 'all' ? 'all jobs' : key === 'in_progress' ? 'in progress' : key}`}
                      accessibilityState={{ selected: selectedFilter === key }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedFilter === key && styles.filterChipTextActive,
                        ]}
                      >
                        {key === 'all'
                          ? 'All'
                          : key === 'in_progress'
                            ? 'In Progress'
                            : key.charAt(0).toUpperCase() + key.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      </ResponsiveContainer>
    </View>
  );
};

// ============================================================================
// IMAGE-FORWARD JOB CARD (Airbnb Pattern)
// ============================================================================

const JobCard: React.FC<{ item: Job; onPress: () => void }> = ({
  item,
  onPress,
}) => {
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.created_at || item.createdAt || Date.now()).getTime()) /
      (1000 * 3600 * 24)
  );
  const photos = item.photos || item.images || [];
  const hasPhotos = photos.length > 0;
  const locationStr = typeof item.location === 'string' ? item.location : item.city || '';
  const budget = item.budget || item.budget_min || 0;
  const urgency = item.urgency || item.priority || 'medium';
  const categoryIcon = CATEGORY_ICONS[item.category?.toLowerCase() || ''] || 'construct-outline';

  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole='button'
      accessibilityLabel={`${item.title}, ${formatStatus(item.status)}, budget £${budget.toLocaleString()}, ${locationStr}`}
      accessibilityHint='Double tap to view job details'
    >
      {/* Hero Image Section */}
      {hasPhotos ? (
        <View style={styles.heroSection}>
          <ImageCarousel
            images={photos}
            height={260}
            width={SCREEN_WIDTH - 40}
            showDots={photos.length > 1}
            gradientOverlay
            overlayContent={
              <View style={styles.overlayRow}>
                <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusTagText}>{formatStatus(item.status)}</Text>
                </View>
                {urgency === 'high' || urgency === 'emergency' ? (
                  <View style={styles.urgentTag}>
                    <Ionicons name="flame" size={12} color="#FFFFFF" />
                    <Text style={styles.urgentTagText}>Urgent</Text>
                  </View>
                ) : null}
              </View>
            }
          />
        </View>
      ) : (
        <View style={styles.placeholderHero}>
          <Ionicons name={categoryIcon} size={48} color={theme.colors.textTertiary} />
          <View style={styles.placeholderOverlay}>
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusTagText}>{formatStatus(item.status)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Content Section */}
      <View style={styles.cardContent}>
        <Text style={styles.jobTitle} numberOfLines={1}>
          {item.title}
        </Text>

        {locationStr ? (
          <View style={styles.locationRow}>
            <Ionicons name='location-outline' size={14} color={theme.colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>{locationStr}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {budget > 0 && (
            <Text style={styles.priceText}>
              {'\u00A3'}{budget.toLocaleString()}
            </Text>
          )}
          {item.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
          )}
          <Text style={styles.timeText}>
            {daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`}
          </Text>
        </View>

        <Text style={styles.jobDescription} numberOfLines={2}>
          {item.description}
        </Text>
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
    case 'completed': return 'Completed';
    default: return status;
  }
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingBottom: 12,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 48,
    ...theme.shadows.base,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },

  // ── Image-Forward Job Card ──
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    ...theme.shadows.base,
  },
  heroSection: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  placeholderHero: {
    height: 220,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  urgentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  urgentTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Card Content ──
  cardContent: {
    padding: 18,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  categoryTag: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  jobDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  // ── Empty & Error ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default JobsScreen;
