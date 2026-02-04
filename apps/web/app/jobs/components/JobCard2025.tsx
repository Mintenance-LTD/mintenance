'use client';

import React from 'react';
import { cardHover } from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionArticle, MotionDiv } from '@/components/ui/MotionDiv';
import { JobCardQuickActions } from './JobCardQuickActions';

interface AIAssessment {
  id: string;
  severity: 'early' | 'midway' | 'full';
  damage_type: string;
  confidence: number;
  urgency: 'immediate' | 'urgent' | 'soon' | 'planned' | 'monitor';
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
    compliance?: {
      requiresProfessionalInspection: boolean;
      complianceScore: number;
    };
  };
}

interface JobCard2025Props {
  job: {
    id: string;
    title: string;
    description: string;
    location: string;
    status: string;
    budget: number;
    category?: string;
    priority?: string;
    photos?: string[];
    created_at: string;
    view_count?: number;
    ai_assessment?: AIAssessment | null;
  };
  viewMode?: 'grid' | 'list';
  prefersReducedMotion?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export const JobCard2025 = React.memo(function JobCard2025({
  job,
  viewMode = 'grid',
  prefersReducedMotion = false,
  selectionMode = false,
  isSelected = false,
  onToggleSelection
}: JobCard2025Props) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      posted: 'bg-blue-100 text-blue-700 border-blue-200',
      assigned: 'bg-teal-100 text-teal-700 border-teal-200',
      in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
      review: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return '';
    const colors: Record<string, string> = {
      low: 'text-blue-600',
      medium: 'text-amber-600',
      high: 'text-emerald-600',
      emergency: 'text-rose-600',
    };
    return colors[priority] || '';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // AI Assessment severity colors and configurations
  const getSeverityConfig = (severity?: 'early' | 'midway' | 'full') => {
    const configs = {
      early: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        dotBg: 'bg-green-400',
        label: 'Minor',
        icon: '✓',
      },
      midway: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        dotBg: 'bg-amber-400',
        label: 'Moderate',
        icon: '!',
      },
      full: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        dotBg: 'bg-red-400',
        label: 'Severe',
        icon: '⚠',
      },
    };
    return severity ? configs[severity] : null;
  };

  const getUrgencyLabel = (urgency?: string) => {
    const labels: Record<string, string> = {
      immediate: 'Immediate Action',
      urgent: 'Urgent',
      soon: 'Soon',
      planned: 'Planned',
      monitor: 'Monitor',
    };
    return labels[urgency || ''] || urgency;
  };

  const formatCostEstimate = (cost?: { min: number; max: number; recommended: number }) => {
    if (!cost) return null;
    if (cost.min === cost.max) {
      return `£${cost.min.toLocaleString()}`;
    }
    return `£${cost.min.toLocaleString()}-${cost.max.toLocaleString()}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode && onToggleSelection) {
      e.preventDefault();
      onToggleSelection();
    }
  };

  return (
    <Link href={selectionMode ? '#' : `/jobs/${job.id}`} onClick={handleCardClick}>
      <MotionArticle
        className={`bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer relative ${
          viewMode === 'list' ? 'flex flex-row' : ''
        } ${
          isSelected ? 'border-teal-500 border-2 ring-2 ring-teal-200' : 'border-gray-200'
        } ${
          selectionMode ? 'hover:border-teal-400' : ''
        }`}
        variants={prefersReducedMotion ? {} : cardHover}
        initial={prefersReducedMotion ? undefined : "rest"}
        whileHover={prefersReducedMotion ? undefined : "hover"}
        whileTap={prefersReducedMotion ? undefined : "tap"}
      >
        {/* Selection Mode Checkbox */}
        {selectionMode && (
          <div className="absolute top-3 left-3 z-20">
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-teal-600 border-teal-600'
                : 'bg-white border-gray-300 hover:border-teal-400'
            }`}>
              {isSelected && (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions Menu - Hidden in selection mode */}
        {!selectionMode && <JobCardQuickActions jobId={job.id} status={job.status} />}

        {/* Image Section */}
        {job.photos && job.photos.length > 0 && (
          <div className={`relative bg-gray-100 ${viewMode === 'list' ? 'w-48 h-full' : 'h-48'}`}>
            <img
              src={job.photos[0]}
              alt={job.title}
              className="w-full h-full object-cover"
            />

            {/* AI Assessment Badge Overlay */}
            {job.ai_assessment && (
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-lg backdrop-blur-sm">
                  {/* AI Icon */}
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 7V12M12 16H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs font-semibold">AI Assessed</span>
                  {job.ai_assessment.confidence >= 80 && (
                    <span className="text-[10px] opacity-90">
                      {job.ai_assessment.confidence}%
                    </span>
                  )}
                </div>

                {/* Severity Indicator */}
                {job.ai_assessment.severity && (
                  <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-md ${
                    getSeverityConfig(job.ai_assessment.severity)?.bg || ''
                  } ${
                    getSeverityConfig(job.ai_assessment.severity)?.border || ''
                  } border ${
                    getSeverityConfig(job.ai_assessment.severity)?.text || ''
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      getSeverityConfig(job.ai_assessment.severity)?.dotBg || ''
                    }`} />
                    <span className="text-[10px] font-medium">
                      {getSeverityConfig(job.ai_assessment.severity)?.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {job.photos.length > 1 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-lg">
                +{job.photos.length - 1} more
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{job.location}</span>
              </div>
            </div>

            {/* Budget */}
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-gray-900">
                £{job.budget.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Budget</div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
            {job.description}
          </p>

          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
              {job.status.replace('_', ' ').toUpperCase()}
            </span>

            {/* Category Badge */}
            {job.category && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
              </span>
            )}

            {/* Priority Badge */}
            {job.priority && (
              <span className={`px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold ${getPriorityColor(job.priority)}`}>
                {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} Priority
              </span>
            )}

            {/* AI Assessment Badges - Only show if no photo overlay */}
            {job.ai_assessment && (!job.photos || job.photos.length === 0) && (
              <>
                <span className="px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-200">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z" opacity="0.3" />
                      <path d="M12 7V12M12 16H12.01" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
                    </svg>
                    AI Analyzed
                  </span>
                </span>

                {job.ai_assessment.severity && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    getSeverityConfig(job.ai_assessment.severity)?.bg || ''
                  } ${
                    getSeverityConfig(job.ai_assessment.severity)?.border || ''
                  } ${
                    getSeverityConfig(job.ai_assessment.severity)?.text || ''
                  }`}>
                    {getSeverityConfig(job.ai_assessment.severity)?.label} Damage
                  </span>
                )}
              </>
            )}
          </div>

          {/* AI Assessment Details Row - Shows cost estimate and urgency */}
          {job.ai_assessment && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-lg border border-indigo-100">
              {/* Cost Estimate */}
              {job.ai_assessment.assessment_data?.contractorAdvice?.estimatedCost && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    Est. {formatCostEstimate(job.ai_assessment.assessment_data.contractorAdvice.estimatedCost)}
                  </span>
                </div>
              )}

              {/* Urgency */}
              {job.ai_assessment.urgency && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {getUrgencyLabel(job.ai_assessment.urgency)}
                  </span>
                </div>
              )}

              {/* Complexity Indicator */}
              {job.ai_assessment.assessment_data?.contractorAdvice?.complexity && (
                <div className="flex items-center gap-1">
                  {['low', 'medium', 'high'].map((level, i) => (
                    <div
                      key={level}
                      className={`w-1.5 h-3 rounded-sm ${
                        i <= ['low', 'medium', 'high'].indexOf(job.ai_assessment.assessment_data?.contractorAdvice?.complexity || 'low')
                          ? job.ai_assessment.assessment_data?.contractorAdvice?.complexity === 'high'
                            ? 'bg-red-400'
                            : job.ai_assessment.assessment_data?.contractorAdvice?.complexity === 'medium'
                            ? 'bg-amber-400'
                            : 'bg-green-400'
                          : 'bg-gray-200'
                      }`}
                      style={{ height: `${12 + i * 3}px` }}
                    />
                  ))}
                  <span className="text-xs text-gray-600 ml-1">
                    {job.ai_assessment.assessment_data?.contractorAdvice?.complexity} complexity
                  </span>
                </div>
              )}

              {/* Safety Warning if critical */}
              {job.ai_assessment.assessment_data?.safetyHazards?.hasCriticalHazards && (
                <div className="flex items-center gap-1 ml-auto">
                  <svg className="w-4 h-4 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 19h20L12 2zm0 3.17L19.62 18H4.38L12 5.17zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
                  </svg>
                  <span className="text-xs font-medium text-red-600">Safety Risk</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Posted {formatTimeAgo(job.created_at)}
              </span>
              {typeof job.view_count === 'number' && job.view_count > 0 && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {job.view_count} {job.view_count === 1 ? 'view' : 'views'}
                </span>
              )}
            </div>

            <MotionDiv
              className="flex items-center gap-1 text-teal-600 font-medium text-sm"
              whileHover={prefersReducedMotion ? undefined : { x: 3 }}
            >
              <span>View Details</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </MotionDiv>
          </div>
        </div>
      </MotionArticle>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Return true if props are equal (component should NOT re-render)
  // Return false if props have changed (component should re-render)
  return (
    prevProps.job.id === nextProps.job.id &&
    prevProps.job.status === nextProps.job.status &&
    prevProps.job.budget === nextProps.job.budget &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.prefersReducedMotion === nextProps.prefersReducedMotion &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.isSelected === nextProps.isSelected
  );
});
