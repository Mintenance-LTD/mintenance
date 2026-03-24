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
import { ResponsiveContainer } from '../../components/responsive';
import { ExploreMapScreen } from '../explore-map/ExploreMapScreen';
import { theme, semanticBg } from '../../theme';

import type { SortMode, FilterStatus, JobStats } from './types';
import { JobCard } from './JobCard';
import { JobsHeroHeader } from './JobsHeroHeader';
import { JobsFilterTabs } from './JobsFilterTabs';
import { JobsEmptyState } from './JobsEmptyState';

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

    allJobs.forEach((j) => {
      const age = (now - new Date(j.created_at || j.createdAt || now).getTime()) / (1000 * 3600 * 24);
      if (age < 1) newToday++;
      const b = j.budget || j.budget_min || 0;
      if (b > 0) { totalBudget += b; budgetCount++; }
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
      const { BidService } = await import('../../services/BidService');
      const bids = await BidService.getBidsByContractor(user!.id);
      const pendingBids = bids.filter((b: { status?: string }) => b.status === 'pending');
      return pendingBids.map((b: { job?: Job }) => b.job).filter(Boolean) as Job[];
    },
    enabled: !!user && isContractor,
  });

  const filterCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = { all: allJobs.length, posted: 0, assigned: 0, in_progress: 0, completed: 0, bid: bidPendingJobs.length, active: 0 };
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
      data = data.filter((j) => j.status === 'in_progress' || j.status === 'assigned');
    } else if (selectedFilter !== 'all') {
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

  const handleAddJob = useCallback(() => {
    navigation.getParent?.()?.navigate('Modal', { screen: 'ServiceRequest' });
  }, [navigation]);

  // -- Map view --
  if (sortMode === 'map' && isContractor) {
    return <ExploreMapScreen onBackToList={() => setSortMode('for_you')} />;
  }

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
        <View style={[styles.errorBanner, { backgroundColor: semanticBg.error }]}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
          <Text style={styles.errorText}>
            {queryError instanceof Error ? queryError.message : 'Failed to load jobs'}
          </Text>
          <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
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
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
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
  mainContainer: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
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
  errorText: { flex: 1, fontSize: 14, color: theme.colors.error },
  retryLinkText: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
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
});

export default JobsScreen;
