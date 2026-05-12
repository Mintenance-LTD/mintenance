'use client';

/**
 * Mint Editorial port of `/contractor/reviews`.
 *
 * Canonical primitives used (mint-editorial.css):
 *   - `.t-h1` + `.t-body` page header
 *   - `.card` hero with the big average-rating block on the left
 *     and the per-star distribution histogram on the right
 *   - `.stars` for the 5-star row (gold via `--me-warm`)
 *   - `.chip` row for rating filter tabs
 *   - `.search-pill` for free-text search
 *   - `.card` per review with brand-soft avatar, response sub-block
 *     (brand-tinted border-left), and inline reply textarea
 *   - `MintEditorialEmptyState` for the no-reviews-yet case
 *
 * Self-contained presentational component — all data + handlers
 * come from the parent (page.tsx). No fetch / no mutation logic
 * lives here so the canonical look is decoupled from the
 * controller.
 */

import React from 'react';
import { Star, Search, Briefcase, Reply, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  jobId: string;
  jobTitle: string;
  jobCategory: string;
  client: string;
  clientAvatar: string | null;
  rating: number;
  comment: string;
  response: string | null;
  responded: boolean;
  responseAt?: string | null;
  responsePublishedAt?: string | null;
  responseBlockedByAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
}

interface RatingBucket {
  stars: number;
  count: number;
}

interface MintEditorialReviewsViewProps {
  stats: ReviewStats;
  ratingDistribution: RatingBucket[];
  filteredReviews: Review[];
  totalReviewCount: number;
  selectedRating: string;
  onSelectedRatingChange: (rating: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showResponseForm: string | null;
  onShowResponseForm: (id: string | null) => void;
  responseText: string;
  onResponseTextChange: (text: string) => void;
  submittingResponse: boolean;
  onSubmitResponse: (reviewId: string) => void;
  formatRelativeDate: (dateStr: string) => string;
}

function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className='stars' aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          strokeWidth={1.5}
          style={{
            color: s <= value ? 'var(--me-warm)' : 'var(--me-line)',
            fill: s <= value ? 'var(--me-warm)' : 'transparent',
          }}
        />
      ))}
    </div>
  );
}

function ResponseModerationLine({ review }: { review: Review }) {
  if (review.responseBlockedByAdmin) {
    return (
      <p className='t-meta' style={{ marginTop: 6, color: 'var(--me-err)' }}>
        An admin has blocked this reply from publication. Reach out to support
        for details.
      </p>
    );
  }
  if (!review.responsePublishedAt && review.responseAt) {
    const publishAt = new Date(
      new Date(review.responseAt).getTime() + 48 * 3600 * 1000
    );
    return (
      <p className='t-meta' style={{ marginTop: 6, color: 'var(--me-warm)' }}>
        Pending moderation — visible to homeowners on{' '}
        {publishAt.toLocaleString()}
      </p>
    );
  }
  if (review.responsePublishedAt) {
    return (
      <p className='t-meta' style={{ marginTop: 6 }}>
        Published {new Date(review.responsePublishedAt).toLocaleDateString()}
      </p>
    );
  }
  return null;
}

export function MintEditorialReviewsView({
  stats,
  ratingDistribution,
  filteredReviews,
  totalReviewCount,
  selectedRating,
  onSelectedRatingChange,
  searchQuery,
  onSearchChange,
  showResponseForm,
  onShowResponseForm,
  responseText,
  onResponseTextChange,
  submittingResponse,
  onSubmitResponse,
  formatRelativeDate,
}: MintEditorialReviewsViewProps) {
  return (
    <div className='col' style={{ gap: 20 }}>
      {/* Page header */}
      <div className='col' style={{ gap: 4 }}>
        <h1 className='t-h1'>Reviews & ratings</h1>
        <p className='t-body'>
          Homeowner feedback on completed jobs — reply within 48 hours so your
          response publishes alongside the review.
        </p>
      </div>

      {/* Hero card: average rating + distribution */}
      <div className='card card-pad'>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) 2fr',
            gap: 32,
            alignItems: 'center',
          }}
        >
          <div className='col' style={{ gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: 'var(--me-ink)',
                  letterSpacing: '-0.02em',
                }}
              >
                {stats.averageRating.toFixed(1)}
              </span>
              <Star
                size={28}
                strokeWidth={1.5}
                style={{
                  color: 'var(--me-warm)',
                  fill: 'var(--me-warm)',
                }}
              />
            </div>
            <StarRow value={Math.round(stats.averageRating)} size={18} />
            <p className='t-body'>
              {stats.totalReviews} review
              {stats.totalReviews !== 1 ? 's' : ''}
              {stats.responseRate > 0 ? (
                <>
                  {' · '}
                  <span style={{ color: 'var(--me-ink-2)' }}>
                    {stats.responseRate}% response rate
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className='col' style={{ gap: 8 }}>
            {ratingDistribution.map((item) => {
              const percentage =
                stats.totalReviews > 0
                  ? (item.count / stats.totalReviews) * 100
                  : 0;
              return (
                <div
                  key={item.stars}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 50px',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span className='t-meta' style={{ fontWeight: 600 }}>
                    {item.stars} star
                  </span>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 6,
                      background: 'var(--me-bg-3)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: 'var(--me-warm)',
                        transition: 'width 500ms ease',
                      }}
                    />
                  </div>
                  <span className='t-meta' style={{ textAlign: 'right' }}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters + search */}
      <div className='card' style={{ padding: 14 }}>
        <div className='col' style={{ gap: 12 }}>
          <div
            className='row'
            style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
          >
            <button
              type='button'
              className={`chip ${selectedRating === 'all' ? 'on' : ''}`}
              onClick={() => onSelectedRatingChange('all')}
            >
              All
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    selectedRating === 'all'
                      ? 'var(--me-on-brand)'
                      : 'var(--me-ink-3)',
                }}
              >
                {totalReviewCount}
              </span>
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                type='button'
                className={`chip ${
                  selectedRating === rating.toString() ? 'on' : ''
                }`}
                onClick={() => onSelectedRatingChange(rating.toString())}
              >
                {rating}
                <Star
                  size={11}
                  strokeWidth={1.5}
                  style={{
                    marginLeft: 4,
                    color:
                      selectedRating === rating.toString()
                        ? 'var(--me-on-brand)'
                        : 'var(--me-warm)',
                    fill:
                      selectedRating === rating.toString()
                        ? 'var(--me-on-brand)'
                        : 'var(--me-warm)',
                  }}
                />
              </button>
            ))}
          </div>

          <div className='search-pill' style={{ padding: '8px 12px' }}>
            <Search size={14} strokeWidth={1.75} />
            <input
              type='search'
              placeholder='Search by client, job, or comment'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                color: 'var(--me-ink)',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      </div>

      {/* Reviews list */}
      {filteredReviews.length === 0 ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: 48 }}
        >
          <Star
            size={36}
            strokeWidth={1.5}
            style={{
              color: 'var(--me-ink-3)',
              margin: '0 auto 12px',
              display: 'block',
            }}
          />
          <h3 className='t-h3' style={{ marginBottom: 6 }}>
            No reviews found
          </h3>
          <p className='t-body'>
            {totalReviewCount === 0
              ? 'Complete jobs to start receiving reviews from homeowners.'
              : 'Try adjusting your filters or search query.'}
          </p>
        </div>
      ) : (
        <div className='col' style={{ gap: 12 }}>
          {filteredReviews.map((review) => (
            <div key={review.id} className='card card-pad'>
              {/* Header: avatar + name + date */}
              <div
                className='row'
                style={{ gap: 12, alignItems: 'center', marginBottom: 10 }}
              >
                <span
                  className='avatar avatar-md'
                  style={{
                    background: 'var(--me-brand-soft)',
                    color: 'var(--me-brand)',
                    fontWeight: 700,
                  }}
                >
                  {review.client.charAt(0).toUpperCase()}
                </span>
                <div className='col' style={{ gap: 2, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {review.client}
                  </div>
                  <div className='t-meta'>
                    {formatRelativeDate(review.createdAt)}
                  </div>
                </div>
              </div>

              {/* Job badge */}
              <div style={{ marginBottom: 10 }}>
                <span
                  className='badge badge-brand'
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Briefcase size={11} strokeWidth={1.75} />
                  {review.jobTitle}
                </span>
              </div>

              {/* Rating */}
              <div style={{ marginBottom: 10 }}>
                <StarRow value={review.rating} size={16} />
              </div>

              {/* Comment */}
              <p
                className='t-body'
                style={{ marginBottom: 12, color: 'var(--me-ink-2)' }}
              >
                {review.comment}
              </p>

              {/* Existing response sub-block */}
              {review.responded && review.response ? (
                <div
                  style={{
                    marginTop: 10,
                    marginLeft: 12,
                    padding: '12px 14px',
                    background: 'var(--me-bg-2)',
                    borderLeft: '2px solid var(--me-brand)',
                    borderRadius: 6,
                  }}
                >
                  <div
                    className='row'
                    style={{
                      gap: 8,
                      alignItems: 'flex-start',
                      marginBottom: 6,
                    }}
                  >
                    <Reply
                      size={13}
                      strokeWidth={1.75}
                      style={{
                        color: 'var(--me-brand)',
                        marginTop: 2,
                      }}
                    />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      Your response
                    </div>
                  </div>
                  <p
                    className='t-body'
                    style={{
                      marginLeft: 21,
                      color: 'var(--me-ink-2)',
                    }}
                  >
                    {review.response}
                  </p>
                  <div style={{ marginLeft: 21 }}>
                    <ResponseModerationLine review={review} />
                  </div>
                </div>
              ) : null}

              {/* Reply form */}
              {showResponseForm === review.id ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: 14,
                    background: 'var(--me-bg-2)',
                    borderRadius: 8,
                    border: '1px solid var(--me-line)',
                  }}
                >
                  <textarea
                    className='field'
                    value={responseText}
                    onChange={(e) => onResponseTextChange(e.target.value)}
                    placeholder='Write your response. Stay professional and thank the homeowner for their feedback.'
                    rows={3}
                    style={{
                      width: '100%',
                      marginBottom: 10,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                  <div className='row' style={{ gap: 8 }}>
                    <button
                      type='button'
                      className='btn btn-primary btn-sm'
                      onClick={() => onSubmitResponse(review.id)}
                      disabled={submittingResponse}
                    >
                      {submittingResponse ? (
                        <Loader2
                          size={13}
                          strokeWidth={1.75}
                          className='animate-spin'
                        />
                      ) : null}
                      Post reply
                    </button>
                    <button
                      type='button'
                      className='btn btn-secondary btn-sm'
                      onClick={() => {
                        onShowResponseForm(null);
                        onResponseTextChange('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Reply CTA */}
              {!review.responded && showResponseForm !== review.id ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm'
                    onClick={() => {
                      onShowResponseForm(review.id);
                      onResponseTextChange('');
                    }}
                  >
                    <Reply size={13} strokeWidth={1.75} />
                    Reply
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
