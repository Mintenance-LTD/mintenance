/**
 * ProfileStats — Impact stat cards
 *
 * Three cards with visual weight: Jobs, Rating (with stars), Reviews.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileStatsProps {
  jobsCompleted: number;
  rating: number;
  reviewCount: number;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  jobsCompleted,
  rating,
  reviewCount,
}) => {
  const displayRating = rating > 0 ? rating.toFixed(1) : '—';
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={styles.container} testID="profile-stats-container">
      {/* Jobs Completed */}
      <View style={styles.card} testID="jobs-stat" accessibilityLabel={`${jobsCompleted} jobs completed`}>
        <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="briefcase" size={18} color="#10B981" />
        </View>
        <Text style={styles.statValue} testID="jobs-value">{jobsCompleted}</Text>
        <Text style={styles.statLabel}>Jobs Done</Text>
      </View>

      {/* Rating */}
      <View style={styles.card} testID="rating-stat" accessibilityLabel={`Rating: ${rating} out of 5`}>
        <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="star" size={18} color="#F59E0B" />
        </View>
        <Text style={styles.statValue} testID="rating-value">{displayRating}</Text>
        <View style={styles.starsRow}>
          {Array(5).fill(0).map((_, i) => (
            <Ionicons
              key={i}
              name={i < fullStars ? 'star' : (i === fullStars && hasHalf ? 'star-half' : 'star-outline')}
              size={10}
              color="#F59E0B"
            />
          ))}
        </View>
      </View>

      {/* Reviews */}
      <View style={styles.card} testID="reviews-stat" accessibilityLabel={`${reviewCount} reviews`}>
        <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name="chatbubbles" size={18} color="#3B82F6" />
        </View>
        <Text style={styles.statValue} testID="reviews-value">{reviewCount}</Text>
        <Text style={styles.statLabel}>Reviews</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222222',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#717171',
    marginTop: 2,
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 4,
  },
});
