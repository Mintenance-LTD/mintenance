import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { JobService } from '../../services/JobService';
import { Job } from '@mintenance/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { ResponsiveContainer } from '../../components/responsive';
import { ExploreMapScreen } from '../explore-map/ExploreMapScreen';
import { ScreenErrorBoundary } from '../../components/ScreenErrorBoundary';
import { semanticBg } from '../../theme';
import { me } from '../../design-system/mint-editorial';

import type { SortMode, FilterStatus, JobStats } from './types';
import { JobCard } from './JobCard';
import { JobsHeroHeader } from './JobsHeroHeader';
import { JobsFilterTabs } from './JobsFilterTabs';
import { JobsEmptyState } from './JobsEmptyState';

const JobsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<JobsStackParamList>>();
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
    AsyncStorage.getItem('saved_jobs')
      .then((v) => {
        if (v) setSavedJobIds(new Set(JSON.parse(v) as string[]));
      })
      .catch(() => {});
  }, []);

  const toggleSave = useCallback(async (jobId: string) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      AsyncStorage.setItem('saved_jobs', JSON.stringify([...next])).catch(
        () => {}
      );
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
    // 2026-05-20 audit fix: align the read-side cache key with what
    // useQueries' job-create mutations invalidate (queryKeys.jobs.all
    // = ['jobs']). The old `['jobs', user?.id, user?.role]` key never
    // matched the all-invalidation, so a newly posted job didn't
    // appear in this list until a manual refetch.
    queryKey:
      user?.role === 'homeowner'
        ? queryKeys.jobs.list(`homeowner:${user.id}`)
        : queryKeys.jobs.list(`contractor:${user?.id ?? 'unknown'}`),
    queryFn: async () => {
      // 2026-04-30 audit P1: replace `user!.id` / `user!.role` with an
      // explicit guard. `enabled: !!user` already prevents this from
      // firing without a user, but a refactor that drops the gate
      // shouldn't be able to crash the app.
      if (!user) throw new Error('Not signed in');
      if (user.role === 'homeowner') {
        return JobService.getJobsByHomeowner(user.id);
      }
      return JobService.getJobsByUser(user.id, 'contractor');
    },
    enabled: !!user,
  });

  // -- Stats --
  const stats: JobStats = useMemo(() => {
    const now = Date.now();
    let newToday = 0;
    let totalBudget = 0;
    let budgetCount = 0;
    let activeCount = 0;
    let totalBids = 0;
    let completedCount = 0;
    let postedCount = 0;

    // Defensive coercion against server NUMERIC-as-string regressions
    // (route fixed 2026-05-22; guards "AVG VALUE" KPI from `+=` on string).
    const toNum = (v: unknown): number | null => {
      if (v == null) return null;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    allJobs.forEach((j) => {
      const age =
        (now - new Date(j.created_at || j.createdAt || now).getTime()) /
        (1000 * 3600 * 24);
      if (age < 1) newToday++;
      const b = toNum(j.budget) ?? toNum(j.budget_min) ?? 0;
      if (b > 0) {
        totalBudget += b;
        budgetCount++;
      }
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

  // -- Filter counts (homeowner) --
  // -- Contractor: fetch jobs with pending bids --
  const { data: bidPendingJobs = [] } = useQuery<Job[]>({
    queryKey: ['contractorBidJobs', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not signed in');
      const { BidService } = await import('../../services/BidService');
      const bids = await BidService.getBidsByContractor(user.id);
      const pendingBids = bids.filter((b) => b.status === 'pending');
      // audit-77 P1: API embeds the relation as `bid.jobs`.
      return pendingBids
        .map((b) => b.jobs ?? b.job)
        .filter((j): j is NonNullable<typeof j> => !!j) as unknown as Job[];
    },
    enabled: !!user && isContractor,
  });

  const filterCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: allJobs.length,
      posted: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      bid: bidPendingJobs.length,
      active: 0,
    };
    allJobs.forEach((j) => {
      const s = j.status as FilterStatus;
      if (s in counts) counts[s]++;
      // "active" = assigned + in_progress for contractors
      if (s === 'in_progress' || s === 'assigned') counts.active++;
    });
    return counts;
  }, [allJobs, bidPendingJobs]);

  // -- Sort & filter --
  const filteredJobs = useMemo(() => {
    let data = [...allJobs];

    // Filter by status tab
    if (selectedFilter === 'bid' && isContractor) {
      data = bidPendingJobs;
    } else if (selectedFilter === 'active' && isContractor) {
      data = data.filter(
        (j) => j.status === 'in_progress' || j.status === 'assigned'
      );
    } else if (selectedFilter !== 'all') {
      data = data.filter((j) => j.status === selectedFilter);
    }

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      // 2026-05-23 audit: live `jobs.description` is NOT NULL, but the
      // mobile cache layer + offline transforms can produce partial
      // records (e.g. an outbox draft, or a row dehydrated by an older
      // offline-store schema). Without null-guards, a single such record
      // crashes the whole search filter and the list goes blank. Every
      // text comparison is now guarded.
      data = data.filter((j) => {
        const title = typeof j.title === 'string' ? j.title.toLowerCase() : '';
        const description =
          typeof j.description === 'string' ? j.description.toLowerCase() : '';
        const location =
          typeof j.location === 'string' ? j.location.toLowerCase() : '';
        return (
          title.includes(q) || description.includes(q) || location.includes(q)
        );
      });
    }

    if (isContractor) {
      switch (sortMode) {
        case 'highest_pay':
          // 2026-05-22 audit C1: Postgres NUMERIC arrives as a string
          // from supabase-js; subtracting strings silently produces
          // NaN and the sort order goes random. Reuse the `toNum`
          // pattern from the stats memo above.
          {
            const toBudget = (j: Job): number => {
              const raw = j.budget ?? j.budget_min ?? 0;
              const n = typeof raw === 'number' ? raw : Number(raw);
              return Number.isFinite(n) ? n : 0;
            };
            data.sort((a, b) => toBudget(b) - toBudget(a));
          }
          break;
        case 'newest':
          data.sort(
            (a, b) =>
              new Date(b.created_at || b.createdAt || 0).getTime() -
              new Date(a.created_at || a.createdAt || 0).getTime()
          );
          break;
        case 'for_you':
        case 'nearest':
        default:
          data.sort(
            (a, b) =>
              new Date(b.created_at || b.createdAt || 0).getTime() -
              new Date(a.created_at || a.createdAt || 0).getTime()
          );
          break;
      }
    } else {
      data.sort((a, b) => {
        const statusOrder: Record<string, number> = {
          in_progress: 0,
          assigned: 1,
          posted: 2,
          completed: 3,
        };
        const aOrder = statusOrder[a.status] ?? 4;
        const bOrder = statusOrder[b.status] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (
          new Date(b.created_at || b.createdAt || 0).getTime() -
          new Date(a.created_at || a.createdAt || 0).getTime()
        );
      });
    }

    return data;
    // 2026-05-26 audit-66 P2: bidPendingJobs added — was missing.
  }, [
    allJobs,
    bidPendingJobs,
    selectedFilter,
    debouncedQuery,
    sortMode,
    isContractor,
  ]);

  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    // audit-66 P2: also invalidate contractor pending-bids.
    if (isContractor && user?.id) {
      queryClient.invalidateQueries({
        queryKey: ['contractorBidJobs', user.id],
      });
    }
  };

  const handleAddJob = useCallback(() => {
    navigation.getParent?.()?.navigate('Modal', { screen: 'ServiceRequest' });
  }, [navigation]);

  // 2026-05-02 audit follow-up (98% readiness step 7): the bidJobIds
  // useMemo previously sat AFTER the `sortMode === 'map'` early return
  // below, so it ran on some renders and not others — a Rules-of-Hooks
  // violation. Hoisted up here so it fires on every render. Cheap to
  // compute (set construction over a small array) so this has no
  // perf impact on the map path.
  const bidJobIds = useMemo(
    () => new Set(bidPendingJobs.map((j) => j.id)),
    [bidPendingJobs]
  );

  // -- Map view (wrapped in error boundary) --
  if (sortMode === 'map' && isContractor) {
    return (
      <ScreenErrorBoundary
        screenName='ExploreMap'
        fallbackComponent={(_error, retry) => (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 40,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
              Map unavailable
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#717171',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              The map view encountered an error. Try again or switch to list
              view.
            </Text>
            <TouchableOpacity
              onPress={retry}
              style={{
                backgroundColor: '#0D9488',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSortMode('for_you')}>
              <Text style={{ color: '#0D9488', fontWeight: '600' }}>
                Back to List
              </Text>
            </TouchableOpacity>
          </View>
        )}
      >
        <ExploreMapScreen onBackToList={() => setSortMode('for_you')} />
      </ScreenErrorBoundary>
    );
  }

  // bidJobIds memo lives above the early-return block — see comment.

  // -- Render job card --
  const renderItem = ({ item }: { item: Job }) => (
    <JobCard
      item={item}
      saved={savedJobIds.has(item.id)}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
      onSave={() => toggleSave(item.id)}
      onBid={() => navigation.navigate('BidSubmission', { jobId: item.id })}
      bidCount={item.bids?.length}
      isContractor={isContractor}
      hasUserBid={selectedFilter === 'bid' || bidJobIds.has(item.id)}
    />
  );

  // -- Header component (rendered inside FlatList) --
  const ListHeader = (
    <View>
      <JobsHeroHeader
        insetTop={insets.top}
        isContractor={isContractor}
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddJob={handleAddJob}
      />

      {/* Error banner */}
      {isError && (
        <View
          style={[styles.errorBanner, { backgroundColor: semanticBg.error }]}
        >
          <Ionicons name='alert-circle' size={18} color={me.errFg} />
          <Text style={styles.errorText}>
            {queryError instanceof Error
              ? queryError.message
              : 'Failed to load jobs'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            accessibilityRole='button'
          >
            <Text style={styles.retryLinkText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <JobsFilterTabs
        isContractor={isContractor}
        sortMode={sortMode}
        selectedFilter={selectedFilter}
        filterCounts={filterCounts}
        onSortModeChange={setSortMode}
        onFilterChange={setSelectedFilter}
      />

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
          {debouncedQuery ? ` for "${debouncedQuery}"` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle='light-content' />
      <ResponsiveContainer
        maxWidth={{ mobile: undefined, tablet: 768, desktop: 1200 }}
        padding={{ mobile: 0, tablet: 16, desktop: 24 }}
        style={styles.container}
        testID='jobs-screen'
      >
        <FlatList
          data={filteredJobs}
          renderItem={renderItem}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <JobsEmptyState
              isContractor={isContractor}
              selectedFilter={selectedFilter}
              onClearSearch={() => setSearchQuery('')}
              onSortModeChange={setSortMode}
              onAddJob={handleAddJob}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={onRefresh}
              tintColor={me.brand}
              colors={[me.brand]}
              progressViewOffset={120}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </ResponsiveContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: me.bg2 },
  container: { flex: 1 },
  listContainer: { paddingBottom: 24 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 14, color: me.errFg },
  retryLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  resultsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resultsText: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
  },
});

export default JobsScreen;
