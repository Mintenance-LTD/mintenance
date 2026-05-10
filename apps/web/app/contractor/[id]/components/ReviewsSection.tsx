import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import type { Review } from '../types';

/**
 * Reviews list with reviewer avatar, rating, job link, and comment.
 * Renders nothing when there are no reviews.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 */
export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) {
    return null;
  }

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
      <h2
        style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text,
          marginBottom: theme.spacing[6],
        }}
      >
        Reviews ({reviews.length})
      </h2>

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
    </div>
  );
}
