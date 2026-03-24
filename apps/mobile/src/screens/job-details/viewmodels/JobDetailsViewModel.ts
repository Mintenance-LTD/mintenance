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
import { AIAnalysisService, AIAnalysis } from '../../../services/AIAnalysisService';
import UnifiedAIServiceMobile from '../../../services/UnifiedAIServiceMobile';
import { supabase } from '../../../config/supabase';
import type { Job } from '@mintenance/types';

export interface JobDetailsState {
  aiAnalysis: AIAnalysis | null;
  aiLoading: boolean;
  job: Job | undefined;
  jobLoading: boolean;
  jobError: unknown;
  contractStatus: string | null;
  escrowStatus: string | null;
  hasReviewed: boolean;
}

export interface JobDetailsActions {
  loadAIAnalysis: (jobData: Job) => Promise<void>;
  handleContractorAssigned: (contractorId: string, bidId: string) => void;
  handleJobStatusUpdate: (updatedJob: Job) => void;
  refetchJob: () => void;
}

export interface JobDetailsViewModel extends JobDetailsState, JobDetailsActions {}

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

  const handleContractorAssigned = useCallback((contractorId: string, bidId: string) => {
    logger.info('Contractor assigned to job', { jobId, contractorId, bidId });
    // Refetch job data to get updated status
    refetchJob();
  }, [jobId, refetchJob]);

  const handleJobStatusUpdate = useCallback((updatedJob: Job) => {
    logger.info('Job status updated', { jobId, status: updatedJob.status });
    // Refetch to get fresh data
    refetchJob();
  }, [jobId, refetchJob]);

  // Fetch contract status, escrow status, and review state for CTA logic
  useEffect(() => {
    let cancelled = false;
    if (!job || !user) return;

    const fetchCTAData = async () => {
      try {
        const [contractsRes, escrowRes, reviewsRes] = await Promise.allSettled([
          supabase.from('contracts').select('id, status').eq('job_id', jobId).order('created_at', { ascending: false }).limit(1),
          supabase.from('escrow_transactions').select('id, status').eq('job_id', jobId).order('created_at', { ascending: false }).limit(1),
          supabase.from('reviews').select('id').eq('job_id', jobId).eq('reviewer_id', user.id).limit(1),
        ]);

        if (cancelled) return;

        if (contractsRes.status === 'fulfilled' && contractsRes.value?.data?.[0]) {
          setContractStatus(contractsRes.value.data[0].status);
        }
        if (escrowRes.status === 'fulfilled' && escrowRes.value?.data?.[0]) {
          setEscrowStatus(escrowRes.value.data[0].status);
        }
        if (reviewsRes.status === 'fulfilled') {
          const reviews = reviewsRes.value?.data;
          setHasReviewed(Array.isArray(reviews) && reviews.length > 0);
        }
      } catch {
        // Non-critical — CTA will fall back to default behavior
      }
    };

    fetchCTAData();
    return () => { cancelled = true; };
  }, [job, jobId, user]);

  // Load AI analysis: first check building_assessments DB, then fall back to real-time analysis
  useEffect(() => {
    let isCancelled = false;

    const loadAnalysis = async () => {
      if (!job?.id || !user) return;

      try {
        setAiLoading(true);

        // 1. Check for stored assessment in building_assessments table
        const { data: storedAssessment } = await supabase
          .from('building_assessments')
          .select('id, damage_type, severity, confidence, urgency, assessment_data, created_at')
          .eq('job_id', job.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isCancelled && storedAssessment) {
          setAiAnalysis({
            damageType: storedAssessment.damage_type || 'Unknown',
            severity: storedAssessment.severity || 'unknown',
            confidence: storedAssessment.confidence || 0,
            urgency: storedAssessment.urgency || 'monitor',
            assessmentData: storedAssessment.assessment_data,
            source: 'database',
          } as AIAnalysis);
          setAiLoading(false);
          return;
        }

        // 2. Fall back to real-time AI analysis if photos exist (any role)
        if (job.photos && job.photos.length > 0 && !isCancelled) {
          const analysis = await AIAnalysisService.analyzeJobPhotos(job);
          if (!isCancelled) {
            setAiAnalysis(analysis);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          logger.error('Failed to load AI analysis:', error);
        }
      } finally {
        if (!isCancelled) {
          setAiLoading(false);
        }
      }
    };

    loadAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [user, job]);

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

    // Actions
    loadAIAnalysis,
    handleContractorAssigned,
    handleJobStatusUpdate,
    refetchJob,
  };
};
