'use client';

import React from 'react';
import { theme } from '@/lib/theme';

interface ProfileReviewsProps {
  reviews: any[];
}

function StarIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill={theme.colors.ratingGold}
      stroke="none"
    >
      <path d="m12 2.5 2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 15.98 6.7 18.81l1.01-5.9-4.29-4.18 5.93-.86L12 2.5Z" />
    </svg>
  );
}

export function ProfileReviews({ reviews }: ProfileReviewsProps) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: '24px',
        padding: theme.spacing[8],
        border: `1px solid ${theme.colors.border}`,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 className="text-xl font-[560] text-gray-900 m-0 tracking-normal">
          Client Feedback
        </h2>
        <p className="text-xs font-[460] text-gray-600 m-0">
          Build trust by collecting fresh testimonials.
        </p>
      </div>

      {reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {reviews.map((review, index) => (
            <div
              key={index}
              style={{
                padding: theme.spacing[6],
                borderRadius: '20px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.backgroundSecondary,
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[4],
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[4],
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '18px',
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.colors.primary,
                    fontWeight: theme.typography.fontWeight.bold,
                    fontSize: theme.typography.fontSize.lg,
                    overflow: 'hidden',
                  }}
                >
                  {review.reviewer?.profile_image_url ? (
                    <img
                      src={review.reviewer.profile_image_url}
                      alt={`${review.reviewer?.first_name ?? ''} ${review.reviewer?.last_name ?? ''}`.trim()}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      {review.reviewer?.first_name?.[0] ?? 'H'}
                      {review.reviewer?.last_name?.[0] ?? ''}
                    </>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.text,
                    }}
                  >
                    {review.reviewer?.first_name} {review.reviewer?.last_name}
                  </span>
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {new Date(review.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    padding: '10px 14px',
                    borderRadius: '14px',
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <StarIcon />
                  <span
                    style={{
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    {review.rating}
                  </span>
                </div>
              </div>

              {review.job && (
                <div
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      backgroundColor: theme.colors.background,
                      border: `1px solid ${theme.colors.borderLight}`,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.primary,
                    }}
                  >
                    {review.job.title?.[0] ?? 'J'}
                  </span>
                  <span>
                    {review.job.title} - {review.job.category}
                  </span>
                </div>
              )}

              {review.comment && (
                <p
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textPrimary,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: theme.spacing[12],
            color: theme.colors.textSecondary,
            borderRadius: '20px',
            border: `1px dashed ${theme.colors.border}`,
            backgroundColor: theme.colors.backgroundSecondary,
          }}
        >
          <p style={{ fontSize: theme.typography.fontSize.lg, marginBottom: theme.spacing[2] }}>
            No reviews yet
          </p>
          <p style={{ fontSize: theme.typography.fontSize.sm }}>
            Complete projects and encourage homeowners to leave feedback.
          </p>
        </div>
      )}
    </div>
  );
}
