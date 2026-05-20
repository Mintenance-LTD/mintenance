import Image from 'next/image';
import { theme } from '@/lib/theme';
import type { CompletedJob, PortfolioPost } from '../types';

/**
 * Portfolio image grid sourced from two places:
 *
 *   1. Completed-job after-photos (`job_photos_metadata` where
 *      photo_type='after'). Each completed job with at least one
 *      after-photo becomes a tile that shows the contractor's
 *      finished work. This is the canonical portfolio — it's
 *      auto-populated whenever a contractor completes a job and
 *      uploads after-photos.
 *
 *   2. `contractor_posts` rows with post_type='work_showcase' for
 *      manual curation (contractor uploads via /api/contractor/upload-
 *      photos). These appear after the completed-job tiles.
 *
 * 2026-05-13 portfolio audit fix: previously this component only
 * rendered `posts` and ignored `completedJobs` entirely — the docs
 * comment even called out the bug. Now both render, with after-
 * photo tiles taking priority (most contractors' track record lives
 * in completed jobs, not manual posts).
 */
export function PortfolioSection({
  posts,
  completedJobs,
}: {
  posts: PortfolioPost[];
  completedJobs: CompletedJob[];
}) {
  const completedJobsWithPhotos = (completedJobs || []).filter(
    (j) => j.photos && j.photos.length > 0
  );
  const postsWithImages = (posts || []).filter(
    (p) => p.images && Array.isArray(p.images) && p.images.length > 0
  );
  const hasContent =
    completedJobsWithPhotos.length > 0 || postsWithImages.length > 0;

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
        {completedJobsWithPhotos.map((job) => (
          <div
            key={`job-${job.id}`}
            style={{
              position: 'relative',
              paddingBottom: '100%',
              borderRadius: theme.borderRadius.lg,
              overflow: 'hidden',
              backgroundColor: theme.colors.backgroundSecondary,
            }}
          >
            <Image
              src={job.photos![0]}
              alt={job.title || 'Completed job'}
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
                {job.title || 'Completed job'}
              </p>
              {job.category ? (
                <p
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    opacity: 0.85,
                    marginTop: 2,
                    textTransform: 'capitalize',
                  }}
                >
                  {job.category.replace(/_/g, ' ')}
                </p>
              ) : null}
            </div>
          </div>
        ))}
        {postsWithImages.map((post) => (
          <div
            key={`post-${post.id}`}
            style={{
              position: 'relative',
              paddingBottom: '100%',
              borderRadius: theme.borderRadius.lg,
              overflow: 'hidden',
              backgroundColor: theme.colors.backgroundSecondary,
            }}
          >
            <Image
              src={post.images![0]}
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
        ))}
      </div>
    </div>
  );
}
