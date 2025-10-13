'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { CircularProgress } from '@/components/ui/CircularProgress';

interface ProfileHeaderProps {
  contractor: any;
  metrics: {
    profileCompletion: number;
    averageRating: number;
    totalReviews: number;
    jobsCompleted: number;
  };
  onEditProfile?: () => void;
  onManageSkills?: () => void;
}

export function ProfileHeader({
  contractor,
  metrics,
  onEditProfile,
  onManageSkills,
}: ProfileHeaderProps) {
  if (!contractor) return null;

  const fullName = [contractor.first_name, contractor.last_name].filter(Boolean).join(' ') || contractor.company_name || 'Your profile';
  const locationLabel = [contractor.city, contractor.country].filter(Boolean).join(', ') || 'Add your location';
  const isAvailable = contractor.is_available !== false;
  const isVerified = Boolean(contractor.email_verified);

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: '24px',
        border: `1px solid ${theme.colors.border}`,
        boxShadow: 'none',
        padding: theme.spacing[8],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: theme.spacing[8],
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: theme.spacing[6], flex: 1, minWidth: '260px' }}>
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '32px',
              backgroundColor: theme.colors.backgroundSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
              overflow: 'hidden',
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            {contractor.profile_image_url ? (
              <img
                src={contractor.profile_image_url}
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <>
                {contractor.first_name?.[0] ?? 'M'}
                {contractor.last_name?.[0] ?? ''}
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3], flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              <span
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textQuaternary,
                  textTransform: 'uppercase',
                  letterSpacing: '1.4px',
                }}
              >
                Profile Overview
              </span>
              <h1
                style={{
                  fontSize: theme.typography.fontSize['4xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textPrimary,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {fullName}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}
              >
                {locationLabel}
              </p>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing[3], flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: isAvailable ? theme.colors.secondaryDark : theme.colors.errorDark,
                  border: `1px solid ${isAvailable ? theme.colors.secondaryLight : theme.colors.errorLight}`,
                }}
              >
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: isAvailable ? theme.colors.secondary : theme.colors.error,
                    display: 'block',
                  }}
                />
                {isAvailable ? 'Open for projects' : 'Not accepting work'}
              </span>

            {isVerified && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  backgroundColor: theme.colors.backgroundSecondary,
                  color: '#2563EB',
                  border: '1px solid rgba(59,130,246,0.25)',
                }}
              >
                <svg
                  width="14"
                  height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            {contractor.bio && (
              <p
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.md,
                  color: theme.colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {contractor.bio}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing[3],
            flexWrap: 'wrap',
          }}
        >
          {onManageSkills && (
            <button
              type="button"
              onClick={onManageSkills}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                letterSpacing: '0.2px',
                cursor: 'pointer',
                transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.background;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.surface;
              }}
            >
              Manage Skills
            </button>
          )}

          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              style={{
                padding: '12px 22px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: theme.colors.primary,
                color: theme.colors.textInverse,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                letterSpacing: '0.2px',
                cursor: 'pointer',
                transition: `background-color ${theme.animation.duration.fast} ${theme.animation.easing.easeOut}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
              }}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing[8],
          paddingTop: theme.spacing[6],
          borderTop: `1px solid ${theme.colors.borderLight}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress
            value={metrics.profileCompletion}
            size={180}
            strokeWidth={14}
            label="Profile Completion"
            showPercentage={true}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: theme.spacing[6],
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: theme.colors.textQuaternary,
              }}
            >
              Jobs Completed
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              {metrics.jobsCompleted}
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}
            >
              Past 12 months
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: theme.colors.textQuaternary,
              }}
            >
              Client Rating
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}
            >
              {metrics.averageRating.toFixed(1)}
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill={theme.colors.ratingGold}
                stroke="none"
              >
                <path d="m12 2.5 2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 15.98 6.7 18.81l1.01-5.9-4.29-4.18 5.93-.86L12 2.5Z" />
              </svg>
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}
            >
              {metrics.totalReviews} reviews
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                color: theme.colors.textQuaternary,
              }}
            >
              Response Time
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              {contractor.response_time_label || '< 2 hrs'}
            </span>
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
              }}
            >
              Average reply
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
