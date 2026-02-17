'use client';

import React from 'react';
import {
  getUrgencyColor,
  formatLocation,
  getHomeownerName,
  getHomeownerInitial,
} from './discoverUtils';

// ── Types shared with the parent ────────────────────────────────────────────

interface AIAssessment {
  id: string;
  severity: 'early' | 'midway' | 'full';
  damage_type: string;
  confidence: number;
  urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
  created_at?: string;
  assessment_data?: {
    contractorAdvice?: {
      estimatedCost?: {
        min: number;
        max: number;
        recommended: number;
      };
      complexity?: 'low' | 'medium' | 'high';
    };
    safetyHazards?: {
      hasCriticalHazards: boolean;
      overallSafetyScore: number;
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
  homeowner: {
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
    rating: number | null;
  } | null;
  property: {
    address: string;
    postcode: string;
  } | null;
  matchScore: number;
  building_assessments?: AIAssessment[] | null;
  distance?: number;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface DiscoverJobCardProps {
  job: DiscoverJob;
  isSaved: boolean;
  isLoading: boolean;
  onSaveToggle: (jobId: string, e?: React.MouseEvent) => void;
  onSkip: (jobId: string, e?: React.MouseEvent) => void;
  onNavigate: (jobId: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function DiscoverJobCard({
  job,
  isSaved,
  isLoading,
  onSaveToggle,
  onSkip,
  onNavigate,
}: DiscoverJobCardProps) {
  // Resolve the most recent AI assessment once
  const latestAssessment =
    job.building_assessments && job.building_assessments.length > 0
      ? [...job.building_assessments].sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        )[0]
      : null;

  return (
    <div
      onClick={() => onNavigate(job.id)}
      className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
    >
      {/* Match Score Badge and Saved Indicator */}
      <div className="relative">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {isSaved && (
            <div className="px-3 py-1 bg-white text-teal-600 rounded-lg font-bold text-sm shadow-lg flex items-center gap-1 border-2 border-teal-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Saved
            </div>
          )}
          <div className="px-3 py-1 bg-teal-600 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {job.matchScore}%
          </div>
        </div>

        {/* Job Image/Placeholder */}
        <div className="h-48 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
          {job.photos && job.photos.length > 0 ? (
            <img
              src={job.photos[0]}
              alt={job.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-20 h-20 text-teal-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Job Details */}
      <div className="p-6">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h3>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {job.category && (
              <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-md text-xs font-semibold">
                {job.category}
              </span>
            )}
            {job.priority && (
              <span
                className={`px-2 py-1 rounded-md text-xs font-semibold border ${getUrgencyColor(job.priority)}`}
              >
                {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
              </span>
            )}

            {/* AI Assessment Badge */}
            {latestAssessment && (
              <AIAssessmentBadges assessment={latestAssessment} />
            )}
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {job.description}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Budget</div>
            <div className="text-lg font-bold text-gray-900">
              {'\u00A3'}{Number(job.budget).toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Location</div>
            <div className="text-sm font-semibold text-gray-900 truncate">
              {formatLocation(job.property)}
            </div>
            {job.distance && (
              <div className="text-xs text-gray-500 mt-1">
                {job.distance.toFixed(1)} km away
              </div>
            )}
          </div>
        </div>

        {/* AI Assessment Details */}
        {latestAssessment && (
          <AIAssessmentDetails assessment={latestAssessment} />
        )}

        {/* Posted By */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {job.homeowner?.profile_image_url ? (
              <img
                src={job.homeowner.profile_image_url}
                alt={getHomeownerName(job.homeowner)}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getHomeownerInitial(job.homeowner)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">
              {getHomeownerName(job.homeowner)}
            </div>
            {job.homeowner?.rating && (
              <div className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-medium text-gray-700">
                  {job.homeowner.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isSaved && (
            <button
              onClick={(e) => onSkip(job.id, e)}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Skip
            </button>
          )}
          <button
            onClick={(e) => onSaveToggle(job.id, e)}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSaved
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-teal-500'
                : 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  {isSaved ? (
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  ) : (
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  )}
                </svg>
                {isSaved ? 'Saved' : 'Save'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components (private to this file) ───────────────────────────────────

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'early':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'midway':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'full':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function AIAssessmentBadges({ assessment }: { assessment: AIAssessment }) {
  return (
    <>
      <span className="px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-semibold flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z"
            opacity="0.3"
          />
          <path
            d="M12 7V12M12 16H12.01"
            strokeWidth="2"
            stroke="currentColor"
            strokeLinecap="round"
          />
        </svg>
        AI Assessed
      </span>

      {assessment.severity && (
        <span
          className={`px-2 py-1 rounded-md text-xs font-semibold border ${getSeverityColor(assessment.severity)}`}
        >
          {assessment.severity === 'early'
            ? 'Minor'
            : assessment.severity === 'midway'
              ? 'Moderate'
              : assessment.severity === 'full'
                ? 'Severe'
                : assessment.severity}{' '}
          Issue
        </span>
      )}
    </>
  );
}

function AIAssessmentDetails({ assessment }: { assessment: AIAssessment }) {
  const estimatedCost =
    assessment.assessment_data?.contractorAdvice?.estimatedCost;
  const urgency = assessment.urgency;

  if (!estimatedCost && !urgency) return null;

  return (
    <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-lg border border-indigo-100 mb-4">
      <div className="flex items-center justify-between gap-3">
        {estimatedCost && (
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <div className="text-xs text-gray-600">AI Estimate</div>
              <div className="text-sm font-semibold text-gray-900">
                {'\u00A3'}{estimatedCost.min.toLocaleString()}-
                {estimatedCost.max.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {urgency && (
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <div className="text-xs text-gray-600">Timeline</div>
              <div className="text-sm font-semibold text-gray-900">
                {urgency === 'immediate'
                  ? 'Immediate'
                  : urgency === 'urgent'
                    ? 'Urgent'
                    : urgency === 'soon'
                      ? 'Soon'
                      : urgency === 'planned'
                        ? 'Planned'
                        : 'Monitor'}
              </div>
            </div>
          </div>
        )}

        {assessment.assessment_data?.safetyHazards?.hasCriticalHazards && (
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4 text-red-600 animate-pulse"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 19h20L12 2zm0 3.17L19.62 18H4.38L12 5.17zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
            </svg>
            <span className="text-xs font-medium text-red-600">
              Safety Risk
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
