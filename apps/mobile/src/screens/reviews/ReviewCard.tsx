/**
 * ReviewCard — extracted from ReviewsScreen for R7 #19 moderation UI.
 *
 * Renders a single contractor review with the reviewer avatar, star
 * rating, job chip, body, and — when applicable — the contractor's
 * reply plus its moderation state (published / pending-48h / blocked).
 *
 * The "Reply" CTA is only shown when no response exists and the
 * review hasn't been admin-blocked.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

export interface Review {
  id: string;
  job_id: string;
  job_title: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  response: string | null;
  responseAt: string | null;
  responsePublishedAt: string | null;
  responseBlockedByAdmin: boolean;
}

const AVATAR_COLORS = [me.ink, me.brand, me.accent, me.ink2];

export const StarRating: React.FC<{ rating: number; size?: number }> = ({
  rating,
  size = 16,
}) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={
          star <= rating
            ? 'star'
            : star - 0.5 <= rating
              ? 'star-half'
              : 'star-outline'
        }
        size={size}
        color={star <= rating || star - 0.5 <= rating ? me.accent : me.line}
      />
    ))}
  </View>
);

export const ReviewCard: React.FC<{
  review: Review;
  index: number;
  onReply: (review: Review) => void;
}> = ({ review, index, onReply }) => {
  let replyBanner: React.ReactNode = null;
  if (review.response) {
    if (review.responseBlockedByAdmin) {
      replyBanner = (
        <Text style={styles.replyBannerBlocked}>
          Your reply was blocked by moderation. Contact support for details.
        </Text>
      );
    } else if (review.responsePublishedAt) {
      replyBanner = (
        <Text style={styles.replyBannerPublished}>
          Your reply is published.
        </Text>
      );
    } else if (review.responseAt) {
      const publishAt = new Date(
        new Date(review.responseAt).getTime() + 48 * 3600 * 1000
      );
      replyBanner = (
        <Text style={styles.replyBannerPending}>
          Reply pending moderation — public on{' '}
          {publishAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      );
    }
  }

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] },
            ]}
          >
            <Text style={styles.avatarText}>
              {review.reviewer_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
            <Text style={styles.reviewDate}>
              {new Date(review.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <StarRating rating={review.rating} />
      </View>

      <View style={styles.jobChip}>
        <Ionicons name='briefcase-outline' size={12} color={me.ink2} />
        <Text style={styles.jobLabel}>{review.job_title}</Text>
      </View>
      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}

      {review.response && (
        <View style={styles.replyBlock}>
          <Text style={styles.replyHeader}>Your reply</Text>
          <Text style={styles.replyBody}>{review.response}</Text>
          {replyBanner}
        </View>
      )}

      {!review.response && !review.responseBlockedByAdmin && (
        <TouchableOpacity
          style={styles.replyCta}
          onPress={() => onReply(review)}
          accessibilityRole='button'
          accessibilityLabel='Reply to this review'
        >
          <Ionicons name='return-up-back-outline' size={16} color={me.brand} />
          <Text style={styles.replyCtaText}>Reply</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reviewCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...me.shadow.card,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: me.onBrand,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  reviewDate: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 1,
  },
  jobChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: me.bg2,
    borderRadius: 8,
    marginBottom: 10,
  },
  jobLabel: {
    fontSize: 11,
    color: me.ink2,
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 21,
  },
  replyBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: me.line,
  },
  replyHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  replyBody: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
  },
  replyBannerPublished: {
    marginTop: 6,
    fontSize: 11,
    color: me.ink3,
  },
  replyBannerPending: {
    marginTop: 6,
    fontSize: 11,
    color: me.accent,
  },
  replyBannerBlocked: {
    marginTop: 6,
    fontSize: 11,
    color: me.errFg,
  },
  replyCta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  replyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: me.brand,
  },
});
