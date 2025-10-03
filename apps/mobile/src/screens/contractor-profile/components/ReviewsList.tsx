/**
 * ReviewsList Component
 * 
 * List of customer reviews with ratings.
 * 
 * @filesize Target: <100 lines
 * @compliance Single Responsibility - Reviews display
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { Review } from '../viewmodels/ContractorProfileViewModel';

interface ReviewsListProps {
  reviews: Review[];
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ reviews }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Reviews</Text>
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewerAvatar} />
            <View style={styles.reviewerInfo}>
              <Text style={styles.reviewerName}>{review.reviewerName}</Text>
              <View style={styles.reviewRatingRow}>
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <Ionicons
                      key={index}
                      name={index < review.rating ? 'star' : 'star-outline'}
                      size={14}
                      color={theme.colors.warning}
                    />
                  ))}
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.reviewComment}>{review.comment}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  reviewerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.borderLight,
    marginRight: theme.spacing.md,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.sm,
  },
  reviewComment: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
