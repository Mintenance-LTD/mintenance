'use client';

import React from 'react';
import {
  Bookmark, BookmarkCheck, X, ChevronRight, Users,
  Wrench, Zap, Home, Paintbrush, Layers, Leaf, Sparkles, Hammer, Bot, MapPin,
} from 'lucide-react';
import { DiscoverPhotoCarousel } from './DiscoverPhotoCarousel';

// ── Match score SVG ring ──────────────────────────────────────────────────────
function MatchRing({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#9ca3af';
  return (
    <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width={44} height={44} aria-hidden>
        <circle cx={22} cy={22} r={r} fill="none" stroke="#f3f4f6" strokeWidth={3} />
        <circle
          cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
        />
      </svg>
      <span className="text-[11px] font-bold leading-none" style={{ color }}>{score}%</span>
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
  homeowner?: { first_name: string; last_name: string; rating: number | null } | null;
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
const URGENCY_BORDER: Record<string, string> = {
  high:   'border-l-[4px] border-l-red-500',
  medium: 'border-l-[4px] border-l-amber-400',
  low:    'border-l-[4px] border-l-green-500',
};

const URGENCY_DOT: Record<string, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-400',
};

type IconComp = React.ComponentType<{ className?: string }>;

const CAT_ICONS: Record<string, IconComp> = {
  plumbing:   Wrench,
  electrical: Zap,
  roofing:    Home,
  painting:   Paintbrush,
  flooring:   Layers,
  gardening:  Leaf,
  cleaning:   Sparkles,
  carpentry:  Hammer,
  general:    Hammer,
};

function getCatIcon(category: string | null): IconComp {
  return CAT_ICONS[(category ?? 'general').toLowerCase()] ?? Hammer;
}

function getBudgetDisplay(job: DiscoverJob): string {
  const est = job.building_assessments?.[0]?.assessment_data?.contractorAdvice?.estimatedCost;
  if (est?.min != null && est?.max != null) {
    return `£${est.min.toLocaleString()} – £${est.max.toLocaleString()}`;
  }
  return `Up to £${job.budget.toLocaleString()}`;
}

function isRecentJob(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 6 * 60 * 60 * 1000;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DiscoverJobCard({
  job, isSaved, isLoading, onSaveToggle, onSkip, onNavigate, onHover,
}: DiscoverJobCardProps) {
  const priority  = (job.priority ?? 'low').toLowerCase();
  const photos    = job.photos ?? [];
  const CatIcon   = getCatIcon(job.category);
  const isNew     = isRecentJob(job.created_at);
  const distBadge = job.distance != null ? `${job.distance.toFixed(1)} km` : undefined;
  const budgetStr = getBudgetDisplay(job);
  const hasBids   = (job.bidCount ?? 0) > 0;
  const hasAI     = (job.building_assessments?.length ?? 0) > 0;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow ${URGENCY_BORDER[priority] ?? ''}`}
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
        <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
          <CatIcon className="w-12 h-12 text-gray-400 opacity-40" />
          {distBadge && (
            <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {distBadge}
            </span>
          )}
          {isNew && (
            <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              NEW
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Title + match ring */}
        <div className="flex items-start gap-2 mb-1">
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1 min-w-0">
            {job.title}
          </h4>
          <MatchRing score={job.matchScore} />
        </div>

        {/* Category + urgency dot */}
        <div className="flex items-center gap-1.5 mb-2">
          {URGENCY_DOT[priority] && (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${URGENCY_DOT[priority]}`} />
          )}
          <span className="flex items-center gap-1 text-xs text-gray-500 capitalize truncate">
            <CatIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {job.category ?? 'General'}
            {priority === 'high' && (
              <span className="text-red-500 font-medium ml-1">• Urgent</span>
            )}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{job.description}</p>

        {/* Budget + bid count */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-teal-700">{budgetStr}</span>
          {hasBids && (
            <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
              <Users className="w-3 h-3" />
              {job.bidCount} bid{job.bidCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* AI badge */}
        {hasAI && (
          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100 mb-3">
            <Bot className="w-3 h-3" /> AI Assessed
          </span>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={e => { e.stopPropagation(); onNavigate(job.id); }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            View &amp; Bid <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={e => onSaveToggle(job.id, e)}
            disabled={isLoading}
            aria-label={isSaved ? 'Unsave job' : 'Save job'}
            className={`p-2 rounded-lg border transition-colors ${
              isSaved
                ? 'bg-teal-50 border-teal-200 text-teal-600'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-teal-600 hover:border-teal-200'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
          <button
            onClick={e => onSkip(job.id, e)}
            aria-label="Skip job"
            className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
