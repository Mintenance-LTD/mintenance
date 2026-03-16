/**
 * ReviewsScreen - Contractor reviews management
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';
import { theme } from '../theme';

interface Review {
  id: string;
  job_id: string;
  job_title: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewsResponse {
  reviews: Array<{
    id: string;
    author: string;
    rating: number;
    date: string;
    comment: string;
    jobType?: string;
  }>;
}

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'Reviews'>;
}

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map(star => (
      <Ionicons
        key={star}
        name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
        size={size}
        color={star <= rating || star - 0.5 <= rating ? theme.colors.accent : theme.colors.border}
      />
    ))}
  </View>
);

const AVATAR_COLORS = ['#222222', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

const ReviewCard: React.FC<{ review: Review; index: number }> = ({ review, index }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <View style={styles.reviewerInfo}>
        <View style={[styles.avatarCircle, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
          <Text style={styles.avatarText}>
            {review.reviewer_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
      </View>
      <StarRating rating={review.rating} />
    </View>

    <View style={styles.jobChip}>
      <Ionicons name="briefcase-outline" size={12} color={theme.colors.textSecondary} />
      <Text style={styles.jobLabel}>{review.job_title}</Text>
    </View>
    {review.comment && (
      <Text style={styles.reviewComment}>{review.comment}</Text>
    )}
  </View>
);

type ReviewFilter = 'all' | 'positive' | 'negative';

export const ReviewsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>('all');

  const { data: reviews, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-reviews', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const response = await apiClient.get<ReviewsResponse>(`/api/contractors/${user.id}/reviews`);
      return (response.reviews || []).map((review) => ({
        id: review.id,
        job_id: '',
        job_title: review.jobType || 'Completed job',
        reviewer_name: review.author || 'Anonymous',
        rating: review.rating,
        comment: review.comment || '',
        created_at: review.date,
      })) as Review[];
    },
    enabled: !!user,
  });

  const averageRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingSpinner message="Loading reviews..." />;
  if (error) return <ErrorView message="Failed to load reviews" onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Reviews" showBack onBack={() => navigation.goBack()} />

      {reviews && reviews.length > 0 && (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.avgRating}>{averageRating}</Text>
            <StarRating rating={parseFloat(averageRating)} size={22} />
            <Text style={styles.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
          </View>

          {/* Rating Distribution */}
          <View style={styles.distributionCard}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter(r => r.rating === star).length;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <View key={star} style={styles.distRow}>
                  <Text style={styles.distLabel}>{star}</Text>
                  <Ionicons name="star" size={12} color={theme.colors.accent} />
                  <View style={styles.distBarBg}>
                    <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>

          {/* Filter Chips - Dark active state */}
          <View style={styles.filterRow}>
            {(['all', 'positive', 'negative'] as ReviewFilter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
                accessibilityRole="button"
                accessibilityLabel={`Filter reviews: ${f === 'all' ? 'All' : f === 'positive' ? '4-5 Stars' : '1-3 Stars'}`}
                accessibilityState={{ selected: filter === f }}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All' : f === 'positive' ? '4-5 Stars' : '1-3 Stars'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {!reviews || reviews.length === 0 ? (
        <EmptyState
          icon="star-outline"
          title="No Reviews Yet"
          subtitle="Reviews from homeowners will appear here after you complete jobs."
          ctaLabel="View My Jobs"
          onCtaPress={() => navigation.navigate('JobsList' as never)}
        />
      ) : (
        <FlatList
          data={reviews.filter(r => {
            if (filter === 'positive') return r.rating >= 4;
            if (filter === 'negative') return r.rating <= 3;
            return true;
          })}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => <ReviewCard review={item} index={index} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    padding: 20,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  avgRating: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  listContainer: {
    padding: 16,
    gap: 10,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  jobChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  jobLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  distributionCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  distLabel: {
    width: 16,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  distBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 4,
  },
  distBarFill: {
    height: 8,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 4,
  },
  distCount: {
    width: 24,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'right',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  filterChipActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.textInverse,
  },
});

export default ReviewsScreen;
