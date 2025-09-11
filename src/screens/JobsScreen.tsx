import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/JobService';
import { Job } from '../types';
import { theme } from '../theme';

type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed';

const JobsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadJobs();
  }, [user]);

  const loadJobs = async () => {
    if (!user) return;
    const jobs =
      user.role === 'homeowner'
        ? await JobService.getJobsByHomeowner(user.id)
        : await JobService.getAvailableJobs();
    setAllJobs(jobs);
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
          j.location.toLowerCase().includes(q)
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

  const renderItem = ({ item }: { item: Job }) => (
    <JobListItem
      item={item}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>
              {user?.role === 'homeowner'
                ? 'Maintenance Hub'
                : 'Job Marketplace'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {user?.role === 'homeowner'
                ? `${allJobs.length} total jobs`
                : `${filteredJobs.length} available opportunities`}
            </Text>
          </View>
          {user?.role === 'homeowner' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('ServiceRequest')}
            >
              <Ionicons name='add' size={20} color='#fff' />
              <Text style={styles.addButtonText}>New Request</Text>
            </TouchableOpacity>
          )}
        </View>

        {user?.role === 'contractor' && (
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons
                name='search'
                size={20}
                color='#666'
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder='Search jobs...'
                placeholderTextColor='#999'
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                {(
                  [
                    'all',
                    'posted',
                    'in_progress',
                    'completed',
                  ] as FilterStatus[]
                ).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterChip,
                      selectedFilter === key && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilter(key)}
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
            <Text style={styles.emptyTitle}>No Jobs</Text>
            <Text style={styles.emptyDescription}>
              {user?.role === 'homeowner'
                ? 'Post your first maintenance job'
                : 'Check back later for new opportunities'}
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const JobListItem: React.FC<{ item: Job; onPress: () => void }> = ({
  item,
  onPress,
}) => {
  const daysAgo = Math.floor(
    (Date.now() -
      new Date(
        item.createdAt || (item as any).created_at || Date.now()
      ).getTime()) /
      (1000 * 3600 * 24)
  );
  const hasPhotos = !!(item.photos && item.photos.length > 0);

  const statusColor = getStatusColor(item.status);
  const statusIcon = getStatusIcon(item.status);

  return (
    <TouchableOpacity style={styles.jobCard} onPress={onPress}>
      <View style={styles.jobCardHeader}>
        <View style={styles.jobTitleSection}>
          <View style={styles.titlePriorityRow}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[styles.priorityBadge, { backgroundColor: '#8E8E93' }]}
            >
              <Text style={styles.priorityText}>
                {(item.priority || 'NORMAL').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.jobTimeAgo}>
            {daysAgo === 0
              ? 'Today'
              : daysAgo === 1
                ? '1 day ago'
                : `${daysAgo} days ago`}
          </Text>
        </View>
        <Text style={styles.jobBudget}>${item.budget.toLocaleString()}</Text>
      </View>

      {hasPhotos && (
        <View style={styles.photosSection}>
          <View style={styles.photosSectionHeader}>
            <Ionicons name='camera' size={16} color='#007AFF' />
            <Text style={styles.photosTitle}>
              Problem Photos ({item.photos?.length || 0})
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photosScroll}
          >
            {item.photos?.slice(0, 3).map((photo, idx) => (
              <Image
                key={idx}
                source={{ uri: photo }}
                style={styles.problemPhoto}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.jobDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.jobMeta}>
        <View style={styles.locationContainer}>
          <Ionicons name='location-outline' size={14} color='#666' />
          <Text style={styles.jobLocation}>{item.location}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons
            name={statusIcon}
            size={12}
            color='#fff'
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'posted':
      return '#007AFF';
    case 'assigned':
      return '#5856D6';
    case 'in_progress':
      return '#FF9500';
    case 'completed':
      return '#34C759';
    default:
      return '#8E8E93';
  }
};

const getStatusIcon = (status: string): any => {
  switch (status) {
    case 'posted':
      return 'radio-button-on';
    case 'assigned':
      return 'person-add';
    case 'in_progress':
      return 'hammer';
    case 'completed':
      return 'checkmark-circle';
    default:
      return 'help-circle';
  }
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'posted':
      return 'Open';
    case 'assigned':
      return 'Assigned';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: theme.colors.textInverse,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textInverse,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.textInverse,
    fontWeight: '500',
  },
  filterChipTextActive: {},
  listContainer: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTitleSection: {
    flex: 1,
  },
  titlePriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 8,
    flexShrink: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    color: theme.colors.textInverse,
    fontWeight: '700',
  },
  jobTimeAgo: {
    fontSize: 13,
    color: '#666',
  },
  jobBudget: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  photosSection: {
    marginBottom: 12,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  photosTitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  photosScroll: {
    paddingVertical: 4,
  },
  problemPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  jobDescription: {
    fontSize: 15,
    color: '#555',
    marginBottom: 12,
    lineHeight: 22,
  },
  jobMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});

export default JobsScreen;
