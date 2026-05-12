'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge.unified';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import {
  getGradientCardStyle,
  getCardHoverStyle,
} from '@/lib/theme-enhancements';
import { useEditorialTokens } from '@/lib/theme/editorial-tokens';

interface JobWithDistance {
  id: string;
  title: string;
  description?: string;
  budget?: string;
  location?: string;
  category?: string;
  status: string;
  created_at: string;
  photos?: string[];
  required_skills?: string[] | null;
  homeowner_id: string;
  homeowner?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  distance?: number;
  coordinates?: { lat: number; lng: number };
  requiredSkills?: string[] | null;
  matchedSkills?: string[];
  skillMatchCount?: number;
  recommendationScore?: number;
  isSaved?: boolean;
}

interface NearbyJobCardProps {
  job: JobWithDistance;
  isRecommended?: boolean;
  savedJobIds: Set<string>;
  savingJobId: string | null;
  onSave: (jobId: string, isSaved: boolean) => void;
  onClick: (jobId: string) => void;
}

export function NearbyJobCard({
  job,
  isRecommended = false,
  savingJobId,
  onSave,
  onClick,
}: NearbyJobCardProps) {
  // Editorial-aware token shim — replaces hard-coded theme.colors.*
  // references with CSS variables when Mint Editorial is active.
  // Component keeps its existing inline-styled layout; only colour
  // tokens flip.
  const tokens = useEditorialTokens();
  // Capture `Date.now()` post-mount via state so render stays pure under
  // `react-hooks/purity`. The NEW badge appears only after hydration —
  // a one-frame delay, but no hydration warning.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  const isRecent = useMemo(() => {
    if (!job.created_at || nowMs == null) return false;
    return new Date(job.created_at).getTime() > nowMs - 7 * 24 * 60 * 60 * 1000;
  }, [job.created_at, nowMs]);

  return (
    <Card
      key={job.id}
      padding='lg'
      hover={true}
      onClick={() => onClick(job.id)}
      style={{
        cursor: 'pointer',
        position: 'relative',
        ...getCardHoverStyle(),
        border: isRecommended
          ? `2px solid ${tokens.primary}`
          : `1px solid ${tokens.border}`,
        boxShadow: isRecommended ? theme.shadows.lg : theme.shadows.md,
        borderRadius: theme.borderRadius.xl,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingTop: theme.spacing[5],
        paddingBottom: theme.spacing[5],
        paddingLeft: theme.spacing[5],
        paddingRight: theme.spacing[5],
      }}
    >
      {/* Recommended Badge - Top Right */}
      {isRecommended && (
        <Badge
          variant='primary'
          style={{
            position: 'absolute',
            top: theme.spacing[4],
            right: theme.spacing[4],
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[1],
          }}
        >
          <Icon name='star' size={12} color={tokens.white} />
          Recommended
        </Badge>
      )}

      {/* Header with title and bookmark */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category and NEW Badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              marginBottom: theme.spacing[2],
              flexWrap: 'wrap',
            }}
          >
            {job.category && (
              <Badge
                variant='info'
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: tokens.backgroundTertiary,
                  color: tokens.textPrimary,
                  border: `1px solid ${tokens.border}`,
                  textTransform: 'lowercase',
                }}
              >
                {job.category}
              </Badge>
            )}
            {isRecent && (
              <Badge
                variant='success'
                style={{
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                  padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                  backgroundColor: tokens.success,
                  color: tokens.white,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                NEW
              </Badge>
            )}
          </div>
          <h3 className='text-lg font-[560] text-gray-900 m-0 tracking-normal'>
            {job.title}
          </h3>
          {job.description && (
            <p
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize.sm,
                color: tokens.textSecondary,
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {job.description}
            </p>
          )}
        </div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onSave(job.id, job.isSaved || false);
          }}
          disabled={savingJobId === job.id}
          aria-label={job.isSaved ? 'Unsave job' : 'Save job'}
        >
          {savingJobId === job.id ? (
            <Icon
              name='loader'
              size={20}
              color={tokens.textSecondary}
              style={{
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : (
            <Icon
              name={job.isSaved ? 'bookmark' : 'bookmarkOutline'}
              size={20}
              color={job.isSaved ? tokens.primary : tokens.textSecondary}
            />
          )}
        </Button>
      </div>

      {/* Budget and Location Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: theme.spacing[3],
          marginBottom: theme.spacing[4],
          padding: theme.spacing[4],
          ...getGradientCardStyle('success'),
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${tokens.success}20`,
        }}
      >
        {job.budget && (
          <div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
                color: tokens.textSecondary,
                marginBottom: theme.spacing[1],
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Budget
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: tokens.textPrimary,
              }}
            >
              <AnimatedCounter
                value={parseFloat(job.budget)}
                formatType='currency'
                currency='GBP'
              />
            </div>
          </div>
        )}
        {job.location && (
          <div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
                color: tokens.textSecondary,
                marginBottom: theme.spacing[1],
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Location
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                color: tokens.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[1],
              }}
            >
              <Icon name='mapPin' size={16} color={tokens.primary} />
              <span>{job.location.split(',').slice(-2).join(',').trim()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Job Metadata */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing[2],
          marginBottom: theme.spacing[3],
        }}
      >
        {job.distance !== undefined && (
          <Badge
            variant='info'
            style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium,
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              backgroundColor: tokens.backgroundSecondary,
              color: tokens.textPrimary,
              border: `1px solid ${tokens.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}
          >
            <Icon name='mapPin' size={12} color={tokens.textSecondary} />
            {job.distance.toFixed(1)} km
          </Badge>
        )}

        {job.skillMatchCount !== undefined && job.skillMatchCount > 0 && (
          <Badge
            variant='success'
            style={{ fontSize: theme.typography.fontSize.xs }}
          >
            <Icon
              name='checkCircle'
              size={12}
              color={tokens.success}
              style={{ marginRight: theme.spacing[1] }}
            />
            {job.skillMatchCount} match
            {job.skillMatchCount !== 1 ? 'es' : ''}
          </Badge>
        )}
      </div>

      {/* Matched Skills */}
      {job.matchedSkills && job.matchedSkills.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing[2],
            marginBottom: theme.spacing[4],
          }}
        >
          {job.matchedSkills.slice(0, 3).map((skill, idx) => (
            <Badge
              key={idx}
              variant='success'
              style={{
                fontSize: theme.typography.fontSize.xs,
                backgroundColor: `${tokens.success}20`,
                color: tokens.success,
                border: `1px solid ${tokens.success}40`,
              }}
            >
              {skill}
            </Badge>
          ))}
          {job.matchedSkills.length > 3 && (
            <Badge
              variant='info'
              style={{ fontSize: theme.typography.fontSize.xs }}
            >
              +{job.matchedSkills.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Posted By */}
      {job.homeowner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            marginBottom: theme.spacing[4],
            padding: theme.spacing[2],
            backgroundColor: tokens.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: theme.borderRadius.full,
              backgroundColor: tokens.primary + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: tokens.primary,
              }}
            >
              {job.homeowner.first_name?.[0] || job.homeowner.email?.[0] || 'U'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: tokens.textSecondary,
                marginBottom: theme.spacing[1],
              }}
            >
              Posted by
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: tokens.textPrimary,
              }}
            >
              {job.homeowner.first_name && job.homeowner.last_name
                ? `${job.homeowner.first_name} ${job.homeowner.last_name}`
                : job.homeowner.email || 'Unknown'}
            </div>
          </div>
        </div>
      )}

      {/* Footer with date and action */}
      <div
        style={{
          paddingTop: theme.spacing[4],
          borderTop: `1px solid ${tokens.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: theme.spacing[3],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[1],
          }}
        >
          <Icon name='calendar' size={14} color={tokens.textTertiary} />
          <span
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: tokens.textSecondary,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            {new Date(job.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        <Button
          variant='primary'
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onClick(job.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            fontWeight: theme.typography.fontWeight.semibold,
            fontSize: theme.typography.fontSize.sm,
            borderRadius: theme.borderRadius.lg,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }}
        >
          Quick Bid
          <Icon name='arrowRight' size={14} />
        </Button>
      </div>
    </Card>
  );
}
