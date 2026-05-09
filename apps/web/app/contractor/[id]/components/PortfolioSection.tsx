import Image from 'next/image';
import { theme } from '@/lib/theme';
import type { CompletedJob, PortfolioPost } from '../types';

/**
 * Portfolio image grid (sourced from `contractor_posts` and
 * `jobs.photos` for completed jobs). Renders nothing when both
 * sources are empty.
 *
 * Note: The original page only iterated `posts` — completedJobs were
 * fetched but never rendered. Preserving that behaviour for behavioural
 * parity; if completedJobs photos should appear, that's a follow-up.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #43).
 */
export function PortfolioSection({
  posts,
  completedJobs,
}: {
  posts: PortfolioPost[];
  completedJobs: CompletedJob[];
}) {
  const hasContent =
    (posts && posts.length > 0) || (completedJobs && completedJobs.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[8],
        border: `1px solid ${theme.colors.border}`,
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
        Portfolio
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        {posts.map((post) =>
          post.images &&
          Array.isArray(post.images) &&
          post.images.length > 0 ? (
            <div
              key={post.id}
              style={{
                position: 'relative',
                paddingBottom: '100%',
                borderRadius: theme.borderRadius.lg,
                overflow: 'hidden',
                backgroundColor: theme.colors.backgroundSecondary,
              }}
            >
              <Image
                src={post.images[0]}
                alt={post.title || 'Portfolio image'}
                fill
                sizes='(max-width: 768px) 100vw, 250px'
                style={{ objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: theme.spacing[3],
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                  color: 'white',
                }}
              >
                <p
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                  }}
                >
                  {post.title}
                </p>
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
