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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';

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
        color={star <= rating || star - 0.5 <= rating ? '#222222' : '#B0B0B0'}
      />
    ))}
  </View>
);

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <View style={styles.reviewerInfo}>
        <View style={styles.avatarCircle}>
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

    <Text style={styles.jobLabel}>{review.job_title}</Text>
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
            <StarRating rating={parseFloat(averageRating)} size={20} />
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
                  <Ionicons name="star" size={12} color="#717171" />
                  <View style={styles.distBarBg}>
                    <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {(['all', 'positive', 'negative'] as ReviewFilter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
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
          onCtaPress={() => navigation.navigate('JobsList')}
        />
      ) : (
        <FlatList
          data={reviews.filter(r => {
            if (filter === 'positive') return r.rating >= 4;
            if (filter === 'negative') return r.rating <= 3;
            return true;
          })}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ReviewCard review={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
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
    backgroundColor: theme.colors.background,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  avgRating: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing[1],
  },
  reviewCount: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing[1],
  },
  listContainer: {
    padding: theme.spacing[4],
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[2],
  },
  avatarText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  reviewerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  reviewDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
  starRow: {
    flexDirection: 'row',
  },
  jobLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing[2],
  },
  reviewComment: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  distributionCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[2],
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
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
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 4,
  },
  distBarFill: {
    height: 8,
    backgroundColor: '#222222',
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
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[2],
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  filterChipActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});

export default ReviewsScreen;

