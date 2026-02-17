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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../components/shared';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/ApiClient';

interface Review {
  id: string;
  job_id: string;
  job_title: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Props {
  navigation: StackNavigationProp<Record<string, unknown>>;
}

const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map(star => (
      <Ionicons
        key={star}
        name={star <= rating ? 'star' : star - 0.5 <= rating ? 'star-half' : 'star-outline'}
        size={size}
        color={theme.colors.warning}
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

export const ReviewsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: reviews, isLoading, error, refetch } = useQuery({
    queryKey: ['contractor-reviews', user?.id],
    queryFn: () => apiClient.get<Review[]>('/api/contractor/reviews'),
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
        <View style={styles.summaryCard}>
          <Text style={styles.avgRating}>{averageRating}</Text>
          <StarRating rating={parseFloat(averageRating)} size={20} />
          <Text style={styles.reviewCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {!reviews || reviews.length === 0 ? (
        <EmptyState
          icon="star-outline"
          title="No Reviews Yet"
          subtitle="Reviews from homeowners will appear here after you complete jobs."
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ReviewCard review={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[2],
  },
  avatarText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
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
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing[2],
  },
  reviewComment: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});

export default ReviewsScreen;
