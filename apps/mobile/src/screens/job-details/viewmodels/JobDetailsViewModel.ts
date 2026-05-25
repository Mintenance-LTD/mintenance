/**
 * JobDetails ViewModel
 *
 * Business logic for job details management.
 * Handles job data, AI analysis, status updates, and contractor assignment.
 *
 * @filesize Target: <170 lines
 * @compliance MVVM - Business logic only
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { useAuth } from '../../../contexts/AuthContext';
import { useJob } from '../../../hooks/useJobs';
import {
  AIAnalysisService,
  AIAnalysis,
} from '../../../services/AIAnalysisService';
import UnifiedAIServiceMobile from '../../../services/UnifiedAIServiceMobile';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import type { Job } from '@mintenance/types';

interface JobDetailsAggregate {
  contractStatus: string | null;
  escrowStatus: string | null;
  hasReviewed: boolean;
  buildingAssessment: {
    id: string;
    damageType: string | null;
    severity: string | null;
    confidence: number | null;
    urgency: string | null;
    assessmentData: Record<string, unknown> | null;
    createdAt: string | null;
  } | null;
  // 2026-05-25 audit-P0-3: aggregate now returns before/after photo
  // counts so the CTA can show "Start Job" on a return visit when
  // before-photos already exist. Optional for backwards compatibility
  // with older server builds while the API change rolls out.
  beforePhotoCount?: number;
  afterPhotoCount?: number;
}

interface JobDetailsState {
  aiAnalysis: AIAnalysis | null;
  aiLoading: boolean;
  job: Job | undefined;
  jobLoading: boolean;
  jobError: unknown;
  contractStatus: string | null;
  escrowStatus: string | null;
  hasReviewed: boolean;
  beforePhotoCount: number;
  afterPhotoCount: number;
}

interface JobDetailsActions {
  loadAIAnalysis: (jobData: Job) => Promise<void>;
  handleContractorAssigned: (contractorId: string, bidId: string) => void;
  handleJobStatusUpdate: (updatedJob: Job) => void;
  refetchJob: () => void;
}

interface JobDetailsViewModel extends JobDetailsState, JobDetailsActions {}

/**
 * Custom hook providing Job Details screen logic
 */
export const useJobDetailsViewModel = (jobId: string): JobDetailsViewModel => {
  const { user } = useAuth();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [contractStatus, setContractStatus] = useState<string | null>(null);
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [beforePhotoCount, setBeforePhotoCount] = useState(0);
  const [afterPhotoCount, setAfterPhotoCount] = useState(0);

  // Use React Query hooks
  const {
    data: rawJobData,
    isLoading: jobLoading,
    error: jobError,
    refetch: refetchJob,
  } = useJob(jobId);
  const job = rawJobData as Job | undefined;

  const loadAIAnalysis = useCallback(async (jobData: Job) => {
    try {
      setAiLoading(true);
      const analysis = await AIAnalysisService.analyzeJobPhotos(jobData);
      setAiAnalysis(analysis);
    } catch (error) {
      logger.error('Failed to load AI analysis:', error);
      // Don't show error to user - AI analysis is optional
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleContractorAssigned = useCallback(
    (contractorId: string, bidId: string) => {
      logger.info('Contractor assigned to job', { jobId, contractorId, bidId });
      // Refetch job data to get updated status
      refetchJob();
    },
    [jobId, refetchJob]
  );

  const handleJobStatusUpdate = useCallback(
    (updatedJob: Job) => {
      logger.info('Job status updated', { jobId, status: updatedJob.status });
      // Refetch to get fresh data
      refetchJob();
    },
    [jobId, refetchJob]
  );

  // 2026-04-30 audit P0-1: previously did 4 direct supabase queries
  // (contracts, escrow_transactions, reviews, building_assessments).
  // Now collapses into a single GET /api/jobs/:id/details aggregate
  // which the server gates on the same ownership rules as
  // /api/jobs/:id and projects the canonical shape.
  useEffect(() => {
    let cancelled = false;
    if (!job?.id || !user) return;

    const fetchDetails = async () => {
      try {
        setAiLoading(true);

        const aggregate = await mobileApiClient.get<JobDetailsAggregate>(
          `/api/jobs/${job.id}/details`
        );

        if (cancelled || !aggregate) return;

        setContractStatus(aggregate.contractStatus ?? null);
        setEscrowStatus(aggregate.escrowStatus ?? null);
        setHasReviewed(!!aggregate.hasReviewed);
        setBeforePhotoCount(aggregate.beforePhotoCount ?? 0);
        setAfterPhotoCount(aggregate.afterPhotoCount ?? 0);

        const stored = aggregate.buildingAssessment;
        if (stored) {
          const assessmentData =
            (stored.assessmentData as {
              recommended_actions?: string[];
              estimated_duration?: string;
            } | null) ?? null;

          const base: AIAnalysis = {
            confidence: stored.confidence ?? 0,
            detectedItems: [stored.damageType || 'Unknown'],
            safetyConcerns:
              stored.urgency === 'immediate'
                ? [
                    {
                      concern: 'Urgent repair needed',
                      severity: 'High' as const,
                      description: `Severity: ${stored.severity || 'unknown'}`,
                    },
                  ]
                : [],
            recommendedActions: assessmentData?.recommended_actions ?? [],
            estimatedComplexity: (stored.severity === 'critical'
              ? 'High'
              : stored.severity === 'moderate'
                ? 'Medium'
                : 'Low') as AIAnalysis['estimatedComplexity'],
            suggestedTools: [],
            estimatedDuration: assessmentData?.estimated_duration ?? 'Unknown',
          };

          setAiAnalysis({
            ...base,
            assessmentData: stored.assessmentData,
            source: 'stored',
          } as AIAnalysis);
          setAiLoading(false);
          return;
        }

        // No stored assessment — fall back to real-time AI analysis if
        // photos exist (any role). AIAnalysisService is itself an HTTP
        // call to the web AI endpoint, so no direct DB access here.
        if (job.photos && job.photos.length > 0 && !cancelled) {
          try {
            const analysis = await AIAnalysisService.analyzeJobPhotos(job);
            if (!cancelled) {
              setAiAnalysis(analysis);
            }
          } catch {
            // AI analysis is optional — silently fail if API is unavailable
          }
        }
      } catch (error) {
        if (!cancelled) {
          logger.warn('Job details aggregate unavailable', { error });
        }
      } finally {
        if (!cancelled) {
          setAiLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [job, jobId, user]);

  return {
    // State
    aiAnalysis,
    aiLoading,
    job,
    jobLoading,
    jobError,
    contractStatus,
    escrowStatus,
    hasReviewed,
    beforePhotoCount,
    afterPhotoCount,

    // Actions
    loadAIAnalysis,
    handleContractorAssigned,
    handleJobStatusUpdate,
    refetchJob,
  };
};
