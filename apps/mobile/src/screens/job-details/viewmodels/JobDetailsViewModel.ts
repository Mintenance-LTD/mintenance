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
import type { Job } from '../../../types';

export interface JobDetailsState {
  aiAnalysis: AIAnalysis | null;
  aiLoading: boolean;
  job: Job | undefined;
  jobLoading: boolean;
  jobError: any;
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

  // Use React Query hooks
  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
    refetch: refetchJob,
  } = useJob(jobId);

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

  // Load AI analysis when job data is available
  useEffect(() => {
    if (user?.role === 'contractor' && job?.photos && job.photos.length > 0) {
      loadAIAnalysis(job);
    }
  }, [user, job, loadAIAnalysis]);

  return {
    // State
    aiAnalysis,
    aiLoading,
    job,
    jobLoading,
    jobError,

    // Actions
    loadAIAnalysis,
    handleContractorAssigned,
    handleJobStatusUpdate,
    refetchJob,
  };
};
