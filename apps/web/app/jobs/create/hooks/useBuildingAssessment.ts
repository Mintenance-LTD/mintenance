'use client';

import { useState, useCallback } from 'react';
import { logger } from '@mintenance/shared';
import { useCSRF } from '@/lib/hooks/useCSRF';

interface DamageAssessment {
  damageType: string;
  severity: string;
  confidence: number;
  description: string;
}

interface SafetyHazards {
  hasSafetyHazards: boolean;
  overallSafetyScore: number;
  criticalFlags: string[];
}

interface BuildingAssessmentResult {
  damageAssessment: DamageAssessment;
  safetyHazards: SafetyHazards;
  urgency: {
    urgency: string;
    reasoning: string;
  };
  estimatedCost?: {
    min: number;
    max: number;
    confidence: number;
  };
  compliance?: {
    complianceScore: number;
    flags: string[];
  };
  decisionResult?: {
    decision: 'automate' | 'escalate';
    reason: string;
    safetyUcb?: number;
    rewardUcb?: number;
  };
}

interface UseBuildingAssessmentOptions {
  onError?: (error: string) => void;
}

interface UseBuildingAssessmentReturn {
  assessment: BuildingAssessmentResult | null;
  isAssessing: boolean;
  assessmentError: string | null;
  assessBuilding: (imageUrls: string[], context?: {
    location?: string;
    propertyType?: string;
    ageOfProperty?: number;
  }) => Promise<BuildingAssessmentResult | null>;
  clearAssessment: () => void;
}

/**
 * Hook for AI-powered building damage assessment
 * Uses the Building Surveyor Service to analyze uploaded images
 */
export function useBuildingAssessment({
  onError,
}: UseBuildingAssessmentOptions = {}): UseBuildingAssessmentReturn {
  const [assessment, setAssessment] = useState<BuildingAssessmentResult | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const { csrfToken } = useCSRF();

  const assessBuilding = useCallback(async (
    imageUrls: string[],
    context?: {
      location?: string;
      propertyType?: string;
      ageOfProperty?: number;
    }
  ): Promise<BuildingAssessmentResult | null> => {
    // #region agent log
    console.log('[DEBUG] assessBuilding called', { imageCount: imageUrls?.length || 0, hasContext: !!context, imageUrls });
    // #endregion
    
    if (!imageUrls || imageUrls.length === 0) {
      const error = 'No images provided for assessment';
      // #region agent log
      console.log('[DEBUG] No images provided, returning early');
      // #endregion
      setAssessmentError(error);
      if (onError) onError(error);
      return null;
    }

    setIsAssessing(true);
    setAssessmentError(null);

    try {
      // #region agent log
      console.log('[DEBUG] Starting building assessment', { imageCount: imageUrls.length, hasContext: !!context, imageUrls: imageUrls.slice(0, 2) });
      // #endregion
      const response = await fetch('/api/building-surveyor/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({
          imageUrls,
          context: context ? {
            location: context.location,
            propertyType: context.propertyType || 'residential',
            ageOfProperty: context.ageOfProperty || 50,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // #region agent log
        const logData = {location:'useBuildingAssessment.ts:107',message:'API response not ok',data:{status:response.status,statusText:response.statusText,errorData,hasError:!!errorData.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'};
        console.log('[DEBUG] Frontend API error:', logData);
        // Try to send to debug endpoint (may fail due to CORS, that's ok)
        fetch('http://127.0.0.1:7242/ingest/048b5fb6-d4d5-486b-b7cc-b35d2d018aaf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData),mode:'no-cors'}).catch(()=>{});
        // #endregion
        // Use the error message from API if available, otherwise create a user-friendly one
        const errorMessage = errorData.error || 
          (response.status === 401 ? 'Authentication failed. Please check your API key configuration.' :
           response.status === 429 ? 'API rate limit exceeded. Please try again in a moment.' :
           'Failed to assess building damage. Please try again.');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAssessment(data);
      return data;
    } catch (error) {
      logger.error('Error assessing building damage', error, {
        service: 'building-assessment',
      });

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to analyze building damage. Please try again.';

      setAssessmentError(errorMessage);
      if (onError) onError(errorMessage);
      return null;
    } finally {
      setIsAssessing(false);
    }
  }, [csrfToken, onError]);

  const clearAssessment = useCallback(() => {
    setAssessment(null);
    setAssessmentError(null);
  }, []);

  return {
    assessment,
    isAssessing,
    assessmentError,
    assessBuilding,
    clearAssessment,
  };
}
