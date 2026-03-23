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

  // REQUEST CANCELLATION FIX: Load AI analysis when job data is available with cleanup
  useEffect(() => {
    let isCancelled = false;

    const loadAnalysis = async () => {
      if (user?.role === 'contractor' && job?.photos && job.photos.length > 0 && !isCancelled) {
        try {
          setAiLoading(true);
          const analysis = await AIAnalysisService.analyzeJobPhotos(job);
          if (!isCancelled) {
            setAiAnalysis(analysis);
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
      }
    };

    loadAnalysis();

    // Cleanup: cancel pending request on unmount
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
