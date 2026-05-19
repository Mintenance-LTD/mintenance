'use client';

import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  X,
  ChevronRight,
  Users,
  Wrench,
  Zap,
  Home,
  Paintbrush,
  Layers,
  Leaf,
  Sparkles,
  Hammer,
  Bot,
  MapPin,
} from 'lucide-react';
import { DiscoverPhotoCarousel } from './DiscoverPhotoCarousel';

// ── Match score SVG ring ──────────────────────────────────────────────────────
function MatchRing({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color =
    score >= 80
      ? 'var(--me-ok-fg)'
      : score >= 60
        ? 'var(--me-warn-fg)'
        : 'var(--me-ink-4)';
  return (
    <div className='relative w-11 h-11 flex-shrink-0 flex items-center justify-center'>
      <svg
        className='absolute inset-0 -rotate-90'
        width={44}
        height={44}
        aria-hidden
      >
        <circle
          cx={22}
          cy={22}
          r={r}
          fill='none'
          stroke='var(--me-line-2)'
          strokeWidth={3}
        />
        <circle
          cx={22}
          cy={22}
          r={r}
          fill='none'
          stroke={color}
          strokeWidth={3}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap='round'
        />
      </svg>
      <span className='text-[11px] font-bold leading-none' style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AIAssessmentForCard {
  urgency?: string;
  confidence?: number;
  damage_type?: string;
  severity?: string;
  assessment_data?: {
    contractorAdvice?: {
      estimatedCost?: { min: number; max: number };
    };
  };
}

export interface DiscoverJob {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budget: number;
  priority: string | null;
  photos: string[] | null;
  created_at: string;
  matchScore: number;
  distance?: number;
  bidCount?: number;
  latitude?: number | null;
  longitude?: number | null;
  property?: { address: string; postcode: string } | null;
  homeowner?: {
    first_name: string;
    last_name: string;
    rating: number | null;
  } | null;
  building_assessments?: AIAssessmentForCard[] | null;
}

interface DiscoverJobCardProps {
  job: DiscoverJob;
  isSaved: boolean;
  isLoading: boolean;
  onSaveToggle: (id: string, e?: React.MouseEvent) => void;
  onSkip: (id: string, e?: React.MouseEvent) => void;
  onNavigate: (id: string) => void;
  onHover?: (id: string | null) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const URGENCY_BORDER_COLOR: Record<string, string> = {
  high: 'var(--me-err-fg)',
  medium: 'var(--me-warn-fg)',
  low: 'var(--me-ok-fg)',
};

const URGENCY_DOT_COLOR: Record<string, string> = {
  high: 'var(--me-err-fg)',
  medium: 'var(--me-warn-fg)',
};

type IconComp = React.ComponentType<{ className?: string }>;

const CAT_ICONS: Record<string, IconComp> = {
  plumbing: Wrench,
  electrical: Zap,
  roofing: Home,
  painting: Paintbrush,
  flooring: Layers,
  gardening: Leaf,
  cleaning: Sparkles,
  carpentry: Hammer,
  general: Hammer,
};

/**
 * Standalone component that picks an icon by category. Doing the lookup
 * inside its own render (rather than `const CatIcon = getCatIcon(...)` in
 * the parent) keeps `DiscoverJobCard`'s render free of component-typed
 * locals — that pattern triggers `react-hooks/static-components` under
 * the React Compiler linter and breaks memoization under React 19.
 */
function CategoryIcon({
  category,
  className,
}: {
  category: string | null;
  className?: string;
}) {
  const Icon = CAT_ICONS[(category ?? 'general').toLowerCase()] ?? Hammer;
  return <Icon className={className} />;
}

function getBudgetDisplay(job: DiscoverJob): string {
  const est =
    job.building_assessments?.[0]?.assessment_data?.contractorAdvice
      ?.estimatedCost;
  if (est?.min != null && est?.max != null) {
    return `£${est.min.toLocaleString()} – £${est.max.toLocaleString()}`;
  }
  return `Up to £${job.budget.toLocaleString()}`;
}

/**
 * Returns true when the job was posted within the last 6 hours. Pure
 * function over the input — but `Date.now()` in render trips
 * `react-hooks/purity`. Callers compute this in a `useMemo` keyed on the
 * job id so SSR and the first client render agree, and the value only
 * recomputes when the card switches jobs.
 */
function isRecentJob(createdAt: string, nowMs: number): boolean {
  return nowMs - new Date(createdAt).getTime() < 6 * 60 * 60 * 1000;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DiscoverJobCard({
  job,
  isSaved,
  isLoading,
  onSaveToggle,
  onSkip,
  onNavigate,
  onHover,
}: DiscoverJobCardProps) {
  const priority = (job.priority ?? 'low').toLowerCase();
  const photos = job.photos ?? [];
  // Capture `Date.now()` inside an effect so it's read post-mount, not
  // during render. Render-time `Date.now()` (even inside useMemo) trips
  // `react-hooks/purity` because the factory still runs in render. On
  // SSR the badge is hidden; once the client mounts, `nowMs` populates
  // and the badge appears if recent. This also avoids any SSR/CSR
  // hydration mismatch on the time-sensitive "NEW" indicator.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  const isNew = React.useMemo(
    () => (nowMs == null ? false : isRecentJob(job.created_at, nowMs)),
    [job.created_at, nowMs]
  );
  const distBadge =
    job.distance != null ? `${job.distance.toFixed(1)} km` : undefined;
  const budgetStr = getBudgetDisplay(job);
  const hasBids = (job.bidCount ?? 0) > 0;
  const hasAI = (job.building_assessments?.length ?? 0) > 0;

  const urgencyBorderColor = URGENCY_BORDER_COLOR[priority];

  return (
    <div
      data-theme='mint-editorial'
      className='rounded-xl overflow-hidden cursor-pointer transition-shadow'
      style={{
        background: 'var(--me-surface)',
        border: '1px solid var(--me-line-2)',
        boxShadow: 'var(--me-shadow-card)',
        fontFamily: 'var(--me-font-body)',
        ...(urgencyBorderColor
          ? { borderLeft: `4px solid ${urgencyBorderColor}` }
          : {}),
      }}
      onClick={() => onNavigate(job.id)}
      onMouseEnter={() => onHover?.(job.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Thumbnail */}
      {photos.length > 0 ? (
        <DiscoverPhotoCarousel
          photos={photos}
          title={job.title}
          distanceBadge={distBadge}
          isNew={isNew}
        />
      ) : (
        <div
          className='relative h-48 flex items-center justify-center'
          style={{
            background:
              'linear-gradient(135deg, var(--me-bg) 0%, var(--me-bg-3) 100%)',
            color: 'var(--me-ink-4)',
          }}
        >
          <CategoryIcon
            category={job.category}
            className='w-12 h-12 opacity-40'
          />
          {distBadge && (
            <span className='absolute top-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1'>
              <MapPin className='w-3 h-3' /> {distBadge}
            </span>
          )}
          {isNew && (
            <span
              className='absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full'
              style={{
                background: 'var(--me-brand)',
                color: 'var(--me-on-brand)',
              }}
            >
              NEW
            </span>
          )}
        </div>
      )}

      <div className='p-4'>
        {/* Title + match ring */}
        <div className='flex items-start gap-2 mb-1'>
          <h4
            className='text-sm font-semibold line-clamp-1 flex-1 min-w-0'
            style={{ color: 'var(--me-ink)' }}
          >
            {job.title}
          </h4>
          <MatchRing score={job.matchScore} />
        </div>

        {/* Category + urgency dot */}
        <div className='flex items-center gap-1.5 mb-2'>
          {URGENCY_DOT_COLOR[priority] && (
            <span
              className='w-2 h-2 rounded-full flex-shrink-0'
              style={{ background: URGENCY_DOT_COLOR[priority] }}
            />
          )}
          <span
            className='flex items-center gap-1 text-xs capitalize truncate'
            style={{ color: 'var(--me-ink-3)' }}
          >
            <CategoryIcon
              category={job.category}
              className='w-3.5 h-3.5 flex-shrink-0'
            />
            {job.category ?? 'General'}
            {priority === 'high' && (
              <span
                className='font-medium ml-1'
                style={{ color: 'var(--me-err-fg)' }}
              >
                • Urgent
              </span>
            )}
          </span>
        </div>

        {/* Description */}
        <p
          className='text-xs line-clamp-2 mb-3'
          style={{ color: 'var(--me-ink-3)' }}
        >
          {job.description}
        </p>

        {/* Budget + bid count */}
        <div className='flex items-center justify-between mb-3'>
          <span
            className='text-sm font-bold'
            style={{ color: 'var(--me-brand-2)' }}
          >
            {budgetStr}
          </span>
          {hasBids && (
            <span
              className='flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border'
              style={{
                color: 'var(--me-warn-fg)',
                background: 'var(--me-warn-bg)',
                borderColor: 'var(--me-warn-bg)',
              }}
            >
              <Users className='w-3 h-3' />
              {job.bidCount} bid{job.bidCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* AI badge */}
        {hasAI && (
          <span
            className='inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border mb-3'
            style={{
              background: 'var(--me-info-bg)',
              color: 'var(--me-info-fg)',
              borderColor: 'var(--me-info-bg)',
            }}
          >
            <Bot className='w-3 h-3' /> AI Assessed
          </span>
        )}

        {/* Actions */}
        <div className='flex gap-2'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(job.id);
            }}
            className='flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors'
            style={{
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
            }}
          >
            View &amp; Bid <ChevronRight className='w-3 h-3' />
          </button>
          <button
            onClick={(e) => onSaveToggle(job.id, e)}
            disabled={isLoading}
            aria-label={isSaved ? 'Unsave job' : 'Save job'}
            className='p-2 rounded-lg border transition-colors'
            style={
              isSaved
                ? {
                    background: 'var(--me-brand-soft)',
                    borderColor: 'var(--me-brand-soft)',
                    color: 'var(--me-brand)',
                  }
                : {
                    background: 'var(--me-bg-2)',
                    borderColor: 'var(--me-line)',
                    color: 'var(--me-ink-3)',
                  }
            }
          >
            {isSaved ? (
              <BookmarkCheck className='w-4 h-4' />
            ) : (
              <Bookmark className='w-4 h-4' />
            )}
          </button>
          <button
            onClick={(e) => onSkip(job.id, e)}
            aria-label='Skip job'
            className='p-2 rounded-lg border transition-colors'
            style={{
              background: 'var(--me-bg-2)',
              borderColor: 'var(--me-line)',
              color: 'var(--me-ink-3)',
            }}
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>
    </div>
  );
}
