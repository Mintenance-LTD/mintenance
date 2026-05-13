import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Review } from '../types';

/**
 * Reviews list with reviewer avatar, rating, job link, and comment.
 * Renders nothing when there are no reviews.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 *
 * 2026-05-13 audit: now surfaces the per-review `would_recommend`
 * pill + an aggregate "X of Y recommend" stat at the header so the
 * recommend signal — collected on /jobs/[id]/review and persisted
 * by migration 20260509155315 — actually shows up to the homeowner
 * comparing contractors before bidding.
 */
export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  // Aggregate recommend stats. Reviews predating the
  // `would_recommend` column (null) are excluded from the denominator
  // so historical reviews don't artificially drag the percentage down.
  const reviewsWithRecommendation = reviews.filter(
    (r) => typeof r.would_recommend === 'boolean'
  );
  const recommendCount = reviewsWithRecommendation.filter(
    (r) => r.would_recommend === true
  ).length;
  const totalRecommendable = reviewsWithRecommendation.length;
  const recommendPercent =
    totalRecommendable > 0
      ? Math.round((recommendCount / totalRecommendable) * 100)
      : null;

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[8],
        border: `1px solid ${theme.colors.border}`,
        marginBottom: theme.spacing[8],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[6],
          flexWrap: 'wrap',
        }}
      >
        <h2
          style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
          }}
        >
          Reviews ({reviews.length})
        </h2>
        {recommendPercent !== null && (
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            <strong style={{ color: theme.colors.text }}>
              {recommendPercent}%
            </strong>{' '}
            of homeowners would recommend ({recommendCount} of{' '}
            {totalRecommendable})
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[6],
        }}
      >
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      style={{
        padding: theme.spacing[6],
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[4],
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: theme.typography.fontWeight.bold,
          }}
        >
          {review.reviewer?.first_name?.[0]}
          {review.reviewer?.last_name?.[0]}
        </div>

        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
            }}
          >
            {review.reviewer?.first_name} {review.reviewer?.last_name}
          </p>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            {new Date(review.created_at).toLocaleDateString('en-GB')}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[1],
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary,
          }}
        >
          <Icon name='star' size={18} color={theme.colors.warning} />
          <span>{review.rating}</span>
        </div>
      </div>

      {review.job && (
        <p
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[3],
            fontStyle: 'italic',
          }}
        >
          Job: {review.job.title}
        </p>
      )}

      {review.comment && (
        <p
          style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.text,
            lineHeight: '1.6',
          }}
        >
          {review.comment}
        </p>
      )}

      {typeof review.would_recommend === 'boolean' && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: theme.spacing[3],
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: '999px',
            backgroundColor: review.would_recommend
              ? `${theme.colors.success}1A` /* ~10% opacity */
              : `${theme.colors.error}1A`,
            border: `1px solid ${
              review.would_recommend ? theme.colors.success : theme.colors.error
            }`,
            color: review.would_recommend
              ? theme.colors.success
              : theme.colors.error,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
          }}
        >
          {review.would_recommend ? (
            <ThumbsUp size={12} color={theme.colors.success} />
          ) : (
            <ThumbsDown size={12} color={theme.colors.error} />
          )}
          <span>
            {review.would_recommend ? 'Would recommend' : "Wouldn't recommend"}
          </span>
        </div>
      )}
    </div>
  );
}
