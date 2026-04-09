/**
 * ReviewsList — Rating breakdown chart + featured review + list
 *
 * Shows a 5-star breakdown bar chart, a featured top review,
 * then remaining reviews below.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Review } from '../viewmodels/ContractorProfileViewModel';
import { theme } from '../../../theme';

interface ReviewsListProps {
  reviews: Review[];
  totalCount?: number;
  averageRating?: number;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  totalCount,
  averageRating = 0,
}) => {
  const count = totalCount ?? reviews.length;

  // Calculate star distribution
  const dist = [0, 0, 0, 0, 0]; // index 0 = 1-star, index 4 = 5-star
  reviews.forEach((r) => {
    const bucket = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4);
    dist[bucket] = (dist[bucket] ?? 0) + 1;
  });
  const maxDist = Math.max(...dist, 1);

  // Featured review = highest rated, most recent
  const featured = [...reviews].sort(
    (a, b) =>
      b.rating - a.rating ||
      new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const remainingReviews = reviews
    .filter((r) => r.id !== featured?.id)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole='header'>
          Reviews {count > 0 ? `(${count})` : ''}
        </Text>
      </View>

      {/* Rating breakdown card */}
      {reviews.length > 0 && (
        <View style={styles.breakdownCard}>
          <View style={styles.ratingOverview}>
            <View style={styles.ratingLeft}>
              <Text style={styles.bigRating}>
                {averageRating > 0 ? averageRating.toFixed(1) : '—'}
              </Text>
              <View style={styles.starsRow}>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Ionicons
                      key={i}
                      name={
                        i < Math.floor(averageRating) ? 'star' : 'star-outline'
                      }
                      size={14}
                      color={theme.colors.accent}
                    />
                  ))}
              </View>
              <Text style={styles.ratingSubtext}>{count} reviews</Text>
            </View>

            <View style={styles.barChart}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const value = dist[stars - 1] ?? 0;
                const pct = maxDist > 0 ? (value / maxDist) * 100 : 0;
                return (
                  <View key={stars} style={styles.barRow}>
                    <Text style={styles.barLabel}>{stars}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(pct, 2)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.barCount}>{value}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Featured review */}
      {featured && (
        <View style={styles.featuredCard}>
          <View style={styles.quoteIcon}>
            <Ionicons
              name='chatbubble-ellipses'
              size={16}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.featuredComment} numberOfLines={4}>
            {featured.comment}
          </Text>
          <View style={styles.featuredFooter}>
            <View style={styles.reviewerAvatar}>
              <Ionicons
                name='person'
                size={14}
                color={theme.colors.textTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredName}>{featured.reviewerName}</Text>
              <View style={styles.featuredMeta}>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < featured.rating ? 'star' : 'star-outline'}
                      size={10}
                      color={theme.colors.accent}
                    />
                  ))}
                <Text style={styles.featuredDate}>{featured.date}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Remaining reviews */}
      {remainingReviews.map((review) => (
        <View
          key={review.id}
          style={styles.reviewCard}
          accessibilityLabel={`Review by ${review.reviewerName}, ${review.rating} out of 5 stars. ${review.comment}`}
        >
          <View style={styles.reviewHeader}>
            <View style={styles.reviewerAvatarSmall}>
              <Ionicons
                name='person'
                size={12}
                color={theme.colors.textTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewerName}>{review.reviewerName}</Text>
              <View style={styles.reviewRatingRow}>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < review.rating ? 'star' : 'star-outline'}
                      size={12}
                      color={theme.colors.accent}
                    />
                  ))}
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.reviewComment} numberOfLines={3}>
            {review.comment}
          </Text>
        </View>
      ))}

      {/* Empty state */}
      {reviews.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name='chatbubbles-outline'
              size={28}
              color={theme.colors.textTertiary}
            />
          </View>
          <Text style={styles.emptyTitle}>No Reviews Yet</Text>
          <Text style={styles.emptyDesc}>
            Be the first to leave a review after your job is complete.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  breakdownCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  ratingOverview: {
    flexDirection: 'row',
    gap: 20,
  },
  ratingLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  bigRating: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  ratingSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  barChart: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    width: 12,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 4,
  },
  barCount: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    width: 20,
    textAlign: 'right',
  },
  featuredCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  quoteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredComment: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  featuredDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginLeft: 6,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginLeft: 6,
  },
  reviewComment: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
});
