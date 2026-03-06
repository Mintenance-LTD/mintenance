import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { styles } from './neighborhoodLeaderboardStyles';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import {
  useNeighborhoodLeaderboard,
  useCommunityScore,
  useNeighborhoodFormatters,
} from '../hooks/useNeighborhood';
import {
  ContractorRanking,
  CommunityChampion,
  JobSuccess,
} from '../services/NeighborhoodService';

interface NeighborhoodLeaderboardProps {
  neighborhoodId: string;
  onContractorPress?: (contractorId: string) => void;
  onJobPress?: (jobId: string) => void;
}

export const NeighborhoodLeaderboard: React.FC<
  NeighborhoodLeaderboardProps
> = ({ neighborhoodId, onContractorPress, onJobPress }) => {
  const [activeTab, setActiveTab] = useState<
    'contractors' | 'successes' | 'champions'
  >('contractors');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: leaderboard,
    isLoading,
    error,
    refetch,
  } = useNeighborhoodLeaderboard(neighborhoodId);

  const { data: communityScore, isLoading: scoreLoading } =
    useCommunityScore(neighborhoodId);

  const {
    formatRankPosition,
    formatResponseTime,
    formatCommunityScore,
    getChampionBadgeEmoji,
    getBadgeLevelColor,
    getContractorSpecialtyIcon,
  } = useNeighborhoodFormatters() as Record<string, (...args: unknown[]) => unknown>;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderContractorItem = (
    contractor: ContractorRanking,
    index: number
  ) => (
    <TouchableOpacity
      key={contractor.contractor_id}
      style={[styles.listItem, index < 3 && styles.topThreeItem]}
      onPress={() => onContractorPress?.(contractor.contractor_id)}
    >
      <View style={styles.rankContainer}>
        <Text style={[styles.rankText, index < 3 && styles.topThreeRank]}>
          {formatRankPosition(contractor.rank_position)}
        </Text>
        {index < 3 && (
          <Ionicons
            name={index === 0 ? 'trophy' : index === 1 ? 'medal' : 'ribbon'}
            size={16}
            color={
              index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
            }
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
            <Ionicons
              name='person'
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
        )}
      </View>

      <View style={styles.contractorInfo}>
        <Text style={styles.contractorName}>{contractor.contractor_name}</Text>
        <View style={styles.contractorMeta}>
          <View style={styles.metaItem}>
            <Ionicons name='star' size={12} color='#FFD700' />
            <Text style={styles.metaText}>
              {contractor.average_rating.toFixed(1)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name='checkmark-circle'
              size={12}
              color={theme.colors.success}
            />
            <Text style={styles.metaText}>
              {contractor.jobs_completed} jobs
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name='time' size={12} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>
              {formatResponseTime(contractor.response_time_avg)}
            </Text>
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
        <Ionicons name='heart' size={14} color={theme.colors.primary} />
        <Text style={styles.endorsementCount}>
          {contractor.community_endorsements}
        </Text>
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
            <Ionicons
              name='calendar'
              size={12}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.successDate}>
              {new Date(jobSuccess.completion_date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.successParties}>
          <Text style={styles.successText}>
            <Text style={styles.contractorName}>
              {jobSuccess.contractor_name}
            </Text>
            {' for '}
            <Text style={styles.homeownerName}>
              {jobSuccess.homeowner_name}
            </Text>
          </Text>
        </View>

        <View style={styles.successFooter}>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= jobSuccess.rating ? 'star' : 'star-outline'}
                size={14}
                color='#FFD700'
              />
            ))}
            <Text style={styles.ratingText}>({jobSuccess.rating}/5)</Text>
          </View>

          {(jobSuccess.before_photo || jobSuccess.after_photo) && (
            <View style={styles.photoIndicator}>
              <Ionicons name='images' size={14} color={theme.colors.textSecondary} />
              <Text style={styles.photoText}>Photos</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCommunityChampion = (
    champion: CommunityChampion,
    index: number
  ) => (
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
          {champion.champion_type
            .replace('_', ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase())}
        </Text>
        <Text style={styles.championScore}>Score: {champion.score}</Text>
      </View>

      <View
        style={[
          styles.badgeLevelIndicator,
          {
            backgroundColor: getBadgeLevelColor(champion.badge_level),
          },
        ]}
      >
        <Text style={styles.badgeLevelText}>
          {champion.badge_level.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  if (isLoading && !leaderboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.loadingText}>
          Loading neighborhood leaderboard...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name='warning' size={48} color={theme.colors.error} />
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
        <Ionicons
          name='location'
          size={48}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.emptyText}>No neighborhood data available</Text>
      </View>
    );
  }

  const scoreFormatted = communityScore
    ? formatCommunityScore(communityScore)
    : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Neighborhood Header */}
      <View style={styles.header}>
        <View style={styles.neighborhoodTitle}>
          <Ionicons name='location' size={24} color={theme.colors.primary} />
          <Text style={styles.neighborhoodName}>
            {leaderboard.neighborhood.name}
          </Text>
        </View>

        <View style={styles.neighborhoodStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {leaderboard.neighborhood.member_count}
            </Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {leaderboard.neighborhood.completed_jobs_count}
            </Text>
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
            name='hammer'
            size={16}
            color={
              activeTab === 'contractors'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'contractors' && styles.activeTabText,
            ]}
          >
            Top Contractors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'successes' && styles.activeTab]}
          onPress={() => setActiveTab('successes')}
        >
          <Ionicons
            name='trophy'
            size={16}
            color={
              activeTab === 'successes'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'successes' && styles.activeTabText,
            ]}
          >
            Recent Success
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'champions' && styles.activeTab]}
          onPress={() => setActiveTab('champions')}
        >
          <Ionicons
            name='star'
            size={16}
            color={
              activeTab === 'champions'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'champions' && styles.activeTabText,
            ]}
          >
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


export default NeighborhoodLeaderboard;
