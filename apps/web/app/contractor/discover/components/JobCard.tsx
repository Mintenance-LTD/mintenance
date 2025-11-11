'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { theme } from '@/lib/theme';
import { formatLocationShort, calculateDistance, formatDistance } from '@/lib/utils/location';
import { formatMoney } from '@/lib/utils/currency';
import { Icon } from '@/components/ui/Icon';

interface JobCardProps {
  job: any;
  contractorLocation?: { latitude: number; longitude: number } | null;
  contractorSkills?: string[];
}

/**
 * Card component displaying job details for contractors
 * Redesigned with photo display, improved layout, and better visual hierarchy
 */
export const JobCard: React.FC<JobCardProps> = ({ job, contractorLocation, contractorSkills }) => {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Check if job is new (posted within 24 hours)
  const isNewJob = job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 24 * 60 * 60 * 1000;

  // Get photos from normalized photoUrls field or fallback to photos field
  const photoUrls = useMemo(() => {
    if (job.photoUrls && Array.isArray(job.photoUrls) && job.photoUrls.length > 0) {
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
      const allSame = trimmed.split('').every((char: string) => char === firstChar);
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
  const displayDescription = descriptionExpanded || !shouldTruncate
    ? sanitizedDescription
    : sanitizedDescription.substring(0, MAX_DESCRIPTION_LENGTH) + '...';

  // Format location
  const locationShort = formatLocationShort(job.location);
  const locationFull = job.location || 'Not specified';

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
  const jobSkills = job.skills || job.category ? [job.category].filter(Boolean) : [];
  
  // Match contractor skills with job skills
  const matchedSkills = contractorSkills
    ? jobSkills.filter(skill => contractorSkills.includes(skill))
    : [];

  const homeownerName = job.homeowner?.first_name || 'Homeowner';
  const homeownerInitial = (job.homeowner?.first_name?.[0] || 'H').toUpperCase();

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Photo Section - Hero Image */}
      {hasPhotos ? (
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: theme.colors.backgroundTertiary,
          overflow: 'hidden',
        }}>
          <Image
            src={firstPhoto}
            alt={job.title || 'Job photo'}
            fill
            style={{ objectFit: 'cover' }}
            priority
            sizes="(max-width: 400px) 100vw, 400px"
          />
          
          {/* Category Badge Overlay */}
          <div style={{
            position: 'absolute',
            top: theme.spacing[3],
            right: theme.spacing[3],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
            alignItems: 'flex-end',
          }}>
            <span style={{
              backgroundColor: theme.colors.primary,
              color: 'white',
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              {job.category || 'General'}
            </span>
            {isNewJob && (
              <span style={{
                backgroundColor: theme.colors.success,
                color: 'white',
                padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.bold,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                NEW
              </span>
            )}
          </div>

          {/* Photo Count Badge */}
          {photoUrls.length > 1 && (
            <div style={{
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
            }}>
              <Icon name="image" size={14} color="white" />
              {photoUrls.length}
            </div>
          )}
        </div>
      ) : (
        // Placeholder when no photos
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: theme.colors.backgroundSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing[2],
            color: theme.colors.textTertiary,
          }}>
            <Icon name="image" size={48} color={theme.colors.textTertiary} />
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary,
            }}>
              No photos available
            </span>
          </div>
          
          {/* Category Badge on Placeholder */}
          <div style={{
            position: 'absolute',
            top: theme.spacing[3],
            right: theme.spacing[3],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
            alignItems: 'flex-end',
          }}>
            <span style={{
              backgroundColor: theme.colors.primary,
              color: 'white',
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
            }}>
              {job.category || 'General'}
            </span>
            {isNewJob && (
              <span style={{
                backgroundColor: theme.colors.success,
                color: 'white',
                padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.bold,
              }}>
                NEW
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div style={{
        padding: theme.spacing[6],
        paddingBottom: theme.spacing[4],
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: theme.spacing[4],
        minHeight: 0,
        overflow: 'auto',
      }}>
        {/* Title */}
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing[2],
            lineHeight: 1.3,
          }}>
            {job.title || 'Untitled Job'}
          </h2>
          
          {/* Date */}
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[3],
          }}>
            Posted {new Date(job.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          {hasValidDescription ? (
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
              lineHeight: 1.6,
              marginBottom: theme.spacing[2],
            }}>
              {displayDescription}
              {shouldTruncate && (
                <button
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.colors.primary,
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
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textTertiary,
              fontStyle: 'italic',
              padding: theme.spacing[4],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md,
              textAlign: 'center',
            }}>
              No description provided
            </div>
          )}
        </div>

        {/* Matched Skills */}
        {matchedSkills.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing[2],
          }}>
            {matchedSkills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: `${theme.colors.success}15`,
                  color: theme.colors.success,
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  border: `1px solid ${theme.colors.success}30`,
                }}
              >
                {skill}
              </span>
            ))}
            {matchedSkills.length > 3 && (
              <span style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.xs,
                padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                display: 'flex',
                alignItems: 'center',
              }}>
                +{matchedSkills.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Budget & Location Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: theme.spacing[4],
          padding: theme.spacing[4],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              marginBottom: theme.spacing[2],
            }}>
              <Icon name="currencyPound" size={16} color={theme.colors.textSecondary} />
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                Budget
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
            }}>
              {formatMoney(job.budget ? parseFloat(job.budget) : 0)}
            </div>
          </div>
          
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
              marginBottom: theme.spacing[2],
            }}>
              <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
                fontWeight: theme.typography.fontWeight.medium,
              }}>
                Location
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: distanceText ? theme.spacing[1] : 0,
            }} title={locationFull}>
              {locationShort}
            </div>
            {distanceText && (
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
              }}>
                <Icon name="navigation" size={12} color={theme.colors.textSecondary} />
                {distanceText} away
              </div>
            )}
          </div>
        </div>

        {/* Timeline (if available) */}
        {job.timeline && (
          <div style={{
            padding: theme.spacing[3],
            backgroundColor: `${theme.colors.info}10`,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.info}30`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              marginBottom: theme.spacing[1],
            }}>
              <Icon name="clock" size={16} color={theme.colors.info} />
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.info,
                fontWeight: theme.typography.fontWeight.semibold,
              }}>
                Timeline
              </div>
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textPrimary,
            }}>
              {job.timeline}
            </div>
          </div>
        )}

        {/* Posted By Section */}
        <div style={{
          marginTop: 'auto',
          paddingTop: theme.spacing[6],
          paddingBottom: theme.spacing[6],
          borderTop: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[4],
          flexShrink: 0,
        }}>
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
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: theme.typography.fontWeight.bold,
              fontSize: theme.typography.fontSize.lg,
              flexShrink: 0,
            }}>
              {homeownerInitial}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textTertiary,
              marginBottom: theme.spacing[1],
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              Posted by
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: job.homeowner?.city ? theme.spacing[1] : 0,
              wordBreak: 'break-word',
            }}>
              {homeownerName}
            </div>
            {job.homeowner?.city && (
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
              }}>
                <Icon name="mapPin" size={12} color={theme.colors.textSecondary} />
                {job.homeowner.city}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
