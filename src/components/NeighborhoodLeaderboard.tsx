import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { 
  useNeighborhoodLeaderboard, 
  useCommunityScore, 
  useNeighborhoodFormatters 
} from '../hooks/useNeighborhood';
import { ContractorRanking, CommunityChampion, JobSuccess } from '../services/NeighborhoodService';

interface NeighborhoodLeaderboardProps {
  neighborhoodId: string;
  onContractorPress?: (contractorId: string) => void;
  onJobPress?: (jobId: string) => void;
}

export const NeighborhoodLeaderboard: React.FC<NeighborhoodLeaderboardProps> = ({
  neighborhoodId,
  onContractorPress,
  onJobPress
}) => {
  const [activeTab, setActiveTab] = useState<'contractors' | 'successes' | 'champions'>('contractors');
  const [refreshing, setRefreshing] = useState(false);

  const { 
    data: leaderboard, 
    isLoading, 
    error, 
    refetch 
  } = useNeighborhoodLeaderboard(neighborhoodId);
  
  const { 
    data: communityScore,
    isLoading: scoreLoading 
  } = useCommunityScore(neighborhoodId);

  const {
    formatRankPosition,
    formatResponseTime,
    formatCommunityScore,
    getChampionBadgeEmoji,
    getBadgeLevelColor,
    getContractorSpecialtyIcon
  } = (useNeighborhoodFormatters() as any);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderContractorItem = (contractor: ContractorRanking, index: number) => (
    <TouchableOpacity
      key={contractor.contractor_id}
      style={[styles.listItem, index < 3 && styles.topThreeItem]}
      onPress={() => onContractorPress?.(contractor.contractor_id)}
    >
      <View style={styles.rankContainer}>
        <Text style={[
          styles.rankText,
          index < 3 && styles.topThreeRank
        ]}>
          {formatRankPosition(contractor.rank_position)}
        </Text>
        {index < 3 && (
          <Ionicons 
            name={index === 0 ? 'trophy' : index === 1 ? 'medal' : 'ribbon'} 
            size={16} 
            color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} 
          />
        )}
      </View>

      <View style={styles.avatarContainer}>
        {contractor.contractor_avatar ? (
          <Image 
            source={{ uri: contractor.contractor_avatar }} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.contractorInfo}>
        <Text style={styles.contractorName}>{contractor.contractor_name}</Text>
        <View style={styles.contractorMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.metaText}>{contractor.average_rating.toFixed(1)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
            <Text style={styles.metaText}>{contractor.jobs_completed} jobs</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={12} color={theme.colors.info} />
            <Text style={styles.metaText}>{formatResponseTime(contractor.response_time_avg)}</Text>
          </View>
        </View>
        {contractor.specialties.length > 0 && (
          <View style={styles.specialtiesContainer}>
            {contractor.specialties.slice(0, 3).map((specialty, i) => (
              <View key={i} style={styles.specialtyChip}>
                <Text style={styles.specialtyIcon}>
                  {getContractorSpecialtyIcon(specialty)}
                </Text>
                <Text style={styles.specialtyText}>{specialty}</Text>
              </View>
            ))}
            {contractor.specialties.length > 3 && (
              <Text style={styles.moreSpecialties}>
                +{contractor.specialties.length - 3} more
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.endorsementBadge}>
        <Ionicons name="heart" size={14} color={theme.colors.primary} />
        <Text style={styles.endorsementCount}>{contractor.community_endorsements}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderJobSuccess = (jobSuccess: JobSuccess, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.listItem}
      onPress={() => onJobPress?.(jobSuccess.job_title)}
    >
      <View style={styles.successContent}>
        <View style={styles.successHeader}>
          <Text style={styles.jobTitle}>{jobSuccess.job_title}</Text>
          <View style={styles.successMeta}>
            <Ionicons name="calendar" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.successDate}>
              {new Date(jobSuccess.completion_date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.successParties}>
          <Text style={styles.successText}>
            <Text style={styles.contractorName}>{jobSuccess.contractor_name}</Text>
            {' for '}
            <Text style={styles.homeownerName}>{jobSuccess.homeowner_name}</Text>
          </Text>
        </View>

        <View style={styles.successFooter}>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= jobSuccess.rating ? 'star' : 'star-outline'}
                size={14}
                color="#FFD700"
              />
            ))}
            <Text style={styles.ratingText}>({jobSuccess.rating}/5)</Text>
          </View>

          {(jobSuccess.before_photo || jobSuccess.after_photo) && (
            <View style={styles.photoIndicator}>
              <Ionicons name="images" size={14} color={theme.colors.primary} />
              <Text style={styles.photoText}>Photos</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCommunityChampion = (champion: CommunityChampion, index: number) => (
    <View key={champion.user_id} style={styles.listItem}>
      <View style={styles.championRank}>
        <Text style={styles.championPosition}>#{index + 1}</Text>
      </View>

      <View style={styles.avatarContainer}>
        {champion.avatar ? (
          <Image source={{ uri: champion.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.championEmoji}>
              {getChampionBadgeEmoji(champion.champion_type)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.championInfo}>
        <Text style={styles.championName}>{champion.user_name}</Text>
        <Text style={styles.championType}>
          {champion.champion_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
        <Text style={styles.championScore}>Score: {champion.score}</Text>
      </View>

      <View style={[styles.badgeLevelIndicator, { 
        backgroundColor: getBadgeLevelColor(champion.badge_level) 
      }]}>
        <Text style={styles.badgeLevelText}>
          {champion.badge_level.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  if (isLoading && !leaderboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading neighborhood leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Unable to load neighborhood data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!leaderboard) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="location" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No neighborhood data available</Text>
      </View>
    );
  }

  const scoreFormatted = communityScore ? formatCommunityScore(communityScore) : null;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Neighborhood Header */}
      <View style={styles.header}>
        <View style={styles.neighborhoodTitle}>
          <Ionicons name="location" size={24} color={theme.colors.primary} />
          <Text style={styles.neighborhoodName}>{leaderboard.neighborhood.name}</Text>
        </View>
        
        <View style={styles.neighborhoodStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{leaderboard.neighborhood.member_count}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{leaderboard.neighborhood.completed_jobs_count}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
          {scoreFormatted && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: scoreFormatted.color }]}>
                {scoreFormatted.score}
              </Text>
              <Text style={styles.statLabel}>{scoreFormatted.level}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contractors' && styles.activeTab]}
          onPress={() => setActiveTab('contractors')}
        >
          <Ionicons 
            name="hammer" 
            size={16} 
            color={activeTab === 'contractors' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'contractors' && styles.activeTabText
          ]}>
            Top Contractors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'successes' && styles.activeTab]}
          onPress={() => setActiveTab('successes')}
        >
          <Ionicons 
            name="trophy" 
            size={16} 
            color={activeTab === 'successes' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'successes' && styles.activeTabText
          ]}>
            Recent Success
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'champions' && styles.activeTab]}
          onPress={() => setActiveTab('champions')}
        >
          <Ionicons 
            name="star" 
            size={16} 
            color={activeTab === 'champions' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'champions' && styles.activeTabText
          ]}>
            Champions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'contractors' && (
          <View>
            {leaderboard.topContractors.map((contractor, index) => 
              renderContractorItem(contractor, index)
            )}
          </View>
        )}

        {activeTab === 'successes' && (
          <View>
            {leaderboard.recentSuccesses.map((success, index) => 
              renderJobSuccess(success, index)
            )}
          </View>
        )}

        {activeTab === 'champions' && (
          <View>
            {leaderboard.communityChampions.map((champion, index) => 
              renderCommunityChampion(champion, index)
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[8],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[8],
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    marginTop: theme.spacing[2],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing[3],
  },
  retryButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing[8],
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[2],
  },
  header: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  neighborhoodTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  neighborhoodName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[2],
  },
  neighborhoodStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  content: {
    padding: theme.spacing[2],
  },
  listItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topThreeItem: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: theme.spacing[3],
    minWidth: 40,
  },
  rankText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  topThreeRank: {
    color: theme.colors.primary,
  },
  avatarContainer: {
    marginRight: theme.spacing[3],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  contractorMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing[1],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing[3],
    marginBottom: theme.spacing[1],
  },
  metaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing[1],
    marginBottom: theme.spacing[1],
  },
  specialtyIcon: {
    fontSize: 12,
    marginRight: theme.spacing[1],
  },
  specialtyText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  moreSpecialties: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  endorsementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  endorsementCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
    marginLeft: theme.spacing[1],
  },
  successContent: {
    flex: 1,
  },
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[1],
  },
  jobTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing[2],
  },
  successMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  successParties: {
    marginBottom: theme.spacing[2],
  },
  successText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  homeownerName: {
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  successFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary,
    marginLeft: theme.spacing[1],
  },
  championRank: {
    alignItems: 'center',
    marginRight: theme.spacing[3],
    minWidth: 30,
  },
  championPosition: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  championEmoji: {
    fontSize: 20,
  },
  championInfo: {
    flex: 1,
  },
  championName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  championType: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing[1],
  },
  championScore: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  badgeLevelIndicator: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  badgeLevelText: {
    fontSize: theme.typography.fontSize.xs,
    color: '#fff',
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default NeighborhoodLeaderboard;
