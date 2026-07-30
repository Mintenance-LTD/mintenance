'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import {
  formatLocationShort,
  calculateDistance,
  formatDistance,
  cleanAddress,
} from '@/lib/utils/location';
import { formatMoney } from '@/lib/utils/currency';
import { Icon } from '@/components/ui/Icon';
import type { Job } from '@mintenance/types';

/**
 * Extended Job type with additional properties for the discover card view.
 * These properties come from joins or computed fields in the API response.
 */
interface DiscoverJobData extends Omit<Job, 'homeowner_id'> {
  photoUrls?: string[];
  latitude?: number;
  longitude?: number;
  skills?: string[];
  timeline?: string;
  homeowner_id?: string;
  show_budget_to_contractors?: boolean;
  budget_min?: number;
  budget_max?: number;
  require_itemized_bids?: boolean;
  homeowner?: {
    id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    rating?: number;
    jobs_count?: number;
    city?: string;
    country?: string;
  };
}

interface JobCardProps {
  job: DiscoverJobData;
  contractorLocation?: { latitude: number; longitude: number } | null;
  contractorSkills?: string[];
}

/**
 * Card component displaying job details for contractors
 * Redesigned with photo display, improved layout, and better visual hierarchy
 */
export const JobCard: React.FC<JobCardProps> = ({
  job,
  contractorLocation,
  contractorSkills,
}) => {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Capture `Date.now()` post-mount via state so render stays pure under
  // the React Compiler's `react-hooks/purity` rule. SSR hides the NEW
  // badge until hydration completes — preferable to a hydration warning.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  const isNewJob = useMemo(() => {
    if (!job.created_at || nowMs == null) return false;
    return nowMs - new Date(job.created_at).getTime() < 24 * 60 * 60 * 1000;
  }, [job.created_at, nowMs]);

  // Get photos from normalized photoUrls field or fallback to photos field
  const photoUrls = useMemo(() => {
    if (
      job.photoUrls &&
      Array.isArray(job.photoUrls) &&
      job.photoUrls.length > 0
    ) {
      return job.photoUrls;
    }
    if (job.photos) {
      if (Array.isArray(job.photos)) {
        return job.photos;
      }
      if (typeof job.photos === 'string') {
        try {
          const parsed = JSON.parse(job.photos);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
    }
    return [];
  }, [job.photoUrls, job.photos]);

  const hasPhotos = photoUrls.length > 0;
  const firstPhoto = photoUrls[0];

  // Sanitize and format description
  const sanitizedDescription = useMemo(() => {
    let desc = job.description || '';

    // Remove HTML tags
    desc = desc.replace(/<[^>]*>/g, '');

    // Remove placeholder characters (like repeated "f" characters)
    // Check if description is mostly the same character repeated
    const trimmed = desc.trim();
    if (trimmed.length > 10) {
      const firstChar = trimmed[0];
      const allSame = trimmed
        .split('')
        .every((char: string) => char === firstChar);
      if (allSame && trimmed.length > 20) {
        return ''; // Likely placeholder text
      }
    }

    // Remove excessive whitespace
    desc = desc.replace(/\s+/g, ' ').trim();

    return desc;
  }, [job.description]);

  const hasValidDescription = sanitizedDescription.length > 10;
  const MAX_DESCRIPTION_LENGTH = 200;
  const shouldTruncate = sanitizedDescription.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription =
    descriptionExpanded || !shouldTruncate
      ? sanitizedDescription
      : sanitizedDescription.substring(0, MAX_DESCRIPTION_LENGTH) + '...';

  // Format location — job.location is JSONB so may be string or object
  const locationStr = typeof job.location === 'string' ? job.location : null;
  const locationShort = formatLocationShort(locationStr);
  const locationFull = cleanAddress(locationStr) || 'Not specified';

  // Calculate distance if contractor location available
  let distanceText: string | null = null;
  if (contractorLocation && job.latitude && job.longitude) {
    const distance = calculateDistance(
      contractorLocation.latitude,
      contractorLocation.longitude,
      job.latitude,
      job.longitude
    );
    distanceText = formatDistance(distance);
  }

  // Extract skills from job (if available)
  const jobSkills: string[] =
    job.skills || (job.category ? [job.category] : []);

  // Match contractor skills with job skills
  const matchedSkills = contractorSkills
    ? jobSkills.filter(
        (skill): skill is string =>
          Boolean(skill) && contractorSkills.includes(skill)
      )
    : [];

  const homeownerName = job.homeowner?.first_name || 'Homeowner';
  const homeownerInitial = (
    job.homeowner?.first_name?.[0] || 'H'
  ).toUpperCase();

  return (
    <div
      data-theme='mint-editorial'
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--me-surface)',
        borderRadius: theme.borderRadius.xl,
        boxShadow: 'var(--me-shadow-pop)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      {/* Photo Section - Hero Image */}
      {hasPhotos && !imageError ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: 'var(--me-bg-3)',
            overflow: 'hidden',
          }}
        >
          <Image
            src={firstPhoto}
            alt={job.title || 'Job photo'}
            fill
            style={{ objectFit: 'cover' }}
            priority
            sizes='(max-width: 400px) 100vw, 400px'
            onError={() => setImageError(true)}
            unoptimized
          />

          {/* Category Badge Overlay */}
          <div
            style={{
              position: 'absolute',
              top: theme.spacing[3],
              right: theme.spacing[3],
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
              alignItems: 'flex-end',
            }}
          >
            <span
              style={{
                backgroundColor: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {job.category || 'General'}
            </span>
            {isNewJob && (
              <span
                style={{
                  backgroundColor: 'var(--me-ok-fg)',
                  color: 'var(--me-on-brand)',
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                NEW
              </span>
            )}
          </div>

          {/* Photo Count Badge */}
          {photoUrls.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: theme.spacing[3],
                right: theme.spacing[3],
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
                backdropFilter: 'blur(10px)',
              }}
            >
              <Icon name='image' size={14} color='white' />
              {photoUrls.length}
            </div>
          )}
        </div>
      ) : (
        // Compact placeholder when no photos
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '120px',
            backgroundColor: 'var(--me-bg-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--me-line)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: theme.spacing[2],
              color: 'var(--me-ink-3)',
            }}
          >
            <Icon name='briefcase' size={32} color='var(--me-ink-3)' />
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: 'var(--me-ink-3)',
              }}
            >
              No photos
            </span>
          </div>

          {/* Category Badge on Placeholder */}
          <div
            style={{
              position: 'absolute',
              top: theme.spacing[3],
              right: theme.spacing[3],
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[2],
              alignItems: 'flex-end',
            }}
          >
            <span
              style={{
                backgroundColor: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
              }}
            >
              {job.category || 'General'}
            </span>
            {isNewJob && (
              <span
                style={{
                  backgroundColor: 'var(--me-ok-fg)',
                  color: 'var(--me-on-brand)',
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                }}
              >
                NEW
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div
        style={{
          padding: theme.spacing[6],
          paddingBottom: theme.spacing[4],
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: theme.spacing[4],
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        {/* Title */}
        <div>
          <h2
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: 'var(--me-ink)',
              fontFamily: 'var(--me-font-display)',
              margin: 0,
              marginBottom: theme.spacing[2],
              lineHeight: 1.3,
            }}
          >
            {job.title || 'Untitled Job'}
          </h2>

          {/* Date */}
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: 'var(--me-ink-2)',
              marginBottom: theme.spacing[3],
            }}
          >
            Posted{' '}
            {new Date(job.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          {hasValidDescription ? (
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                color: 'var(--me-ink-2)',
                lineHeight: 1.6,
                marginBottom: theme.spacing[2],
              }}
            >
              {displayDescription}
              {shouldTruncate && (
                <button
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--me-brand)',
                    cursor: 'pointer',
                    padding: `0 ${theme.spacing[1]}`,
                    marginLeft: theme.spacing[1],
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.medium,
                    textDecoration: 'underline',
                  }}
                >
                  {descriptionExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                color: 'var(--me-ink-3)',
                fontStyle: 'italic',
                padding: theme.spacing[4],
                backgroundColor: 'var(--me-bg-2)',
                borderRadius: theme.borderRadius.md,
                textAlign: 'center',
              }}
            >
              No description provided
            </div>
          )}
        </div>

        {/* Matched Skills */}
        {matchedSkills.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: theme.spacing[2],
            }}
          >
            {matchedSkills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: 'var(--me-ok-bg)',
                  color: 'var(--me-ok-fg)',
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  border: '1px solid var(--me-ok-bg)',
                }}
              >
                {skill}
              </span>
            ))}
            {matchedSkills.length > 3 && (
              <span
                style={{
                  color: 'var(--me-ink-2)',
                  fontSize: theme.typography.fontSize.xs,
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                +{matchedSkills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Location (budget removed 2026-05-22 — contractors price the
            job themselves and the homeowner picks from the bids). */}
        <div
          style={{
            padding: theme.spacing[4],
            backgroundColor: 'var(--me-bg-2)',
            borderRadius: theme.borderRadius.lg,
            border: '1px solid var(--me-line)',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
                marginBottom: theme.spacing[2],
              }}
            >
              <Icon name='mapPin' size={16} color='var(--me-ink-2)' />
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: 'var(--me-ink-3)',
                  fontWeight: theme.typography.fontWeight.medium,
                }}
              >
                Location
              </div>
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                color: 'var(--me-ink)',
                marginBottom: distanceText ? theme.spacing[1] : 0,
              }}
              title={locationFull}
            >
              {locationShort}
            </div>
            {distanceText && (
              <div
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: 'var(--me-ink-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                }}
              >
                <Icon name='navigation' size={12} color='var(--me-ink-2)' />
                {distanceText} away
              </div>
            )}
          </div>
        </div>

        {/* Timeline (if available) */}
        {job.timeline && (
          <div
            style={{
              padding: theme.spacing[3],
              backgroundColor: 'var(--me-info-bg)',
              borderRadius: theme.borderRadius.md,
              border: '1px solid var(--me-info-bg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                marginBottom: theme.spacing[1],
              }}
            >
              <Icon name='clock' size={16} color='var(--me-info-fg)' />
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: 'var(--me-info-fg)',
                  fontWeight: theme.typography.fontWeight.semibold,
                }}
              >
                Timeline
              </div>
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                color: 'var(--me-ink)',
              }}
            >
              {job.timeline}
            </div>
          </div>
        )}

        {/* Posted By Section */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: theme.spacing[6],
            paddingBottom: theme.spacing[6],
            borderTop: '1px solid var(--me-line)',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[4],
            flexShrink: 0,
          }}
        >
          {job.homeowner?.profile_image_url ? (
            <Image
              src={job.homeowner.profile_image_url}
              alt={homeownerName}
              width={56}
              height={56}
              style={{
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--me-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--me-on-brand)',
                fontWeight: theme.typography.fontWeight.bold,
                fontSize: theme.typography.fontSize.lg,
                flexShrink: 0,
              }}
            >
              {homeownerInitial}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: 'var(--me-ink-3)',
                marginBottom: theme.spacing[1],
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              Posted by
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: 'var(--me-ink)',
                marginBottom: job.homeowner?.city ? theme.spacing[1] : 0,
                wordBreak: 'break-word',
              }}
            >
              {homeownerName}
            </div>
            {job.homeowner?.city && (
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: 'var(--me-ink-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                }}
              >
                <Icon name='mapPin' size={12} color='var(--me-ink-2)' />
                {job.homeowner.city}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
