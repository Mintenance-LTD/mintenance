'use client';

import { useState, useCallback } from 'react';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { clientErrorMessage } from '@/lib/errors/client-message';

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
  assessBuilding: (
    imageUrls: string[],
    context?: {
      location?: string;
      propertyType?: string;
      ageOfProperty?: number;
    }
  ) => Promise<BuildingAssessmentResult | null>;
  clearAssessment: () => void;
}

/**
 * Hook for AI-powered building damage assessment
 * Uses the Building Surveyor Service to analyze uploaded images
 */
export function useBuildingAssessment({
  onError,
}: UseBuildingAssessmentOptions = {}): UseBuildingAssessmentReturn {
  const [assessment, setAssessment] = useState<BuildingAssessmentResult | null>(
    null
  );
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  const assessBuilding = useCallback(
    async (
      imageUrls: string[],
      context?: {
        location?: string;
        propertyType?: string;
        ageOfProperty?: number;
      }
    ): Promise<BuildingAssessmentResult | null> => {
      if (!imageUrls || imageUrls.length === 0) {
        const error = 'No images provided for assessment';
        setAssessmentError(error);
        if (onError) onError(error);
        return null;
      }

      setIsAssessing(true);
      setAssessmentError(null);

      try {
        const response = await fetch('/api/building-surveyor/assess', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
          body: JSON.stringify({
            imageUrls,
            context: context
              ? {
                  location: context.location,
                  propertyType: context.propertyType || 'residential',
                  ageOfProperty: context.ageOfProperty || 50,
                }
              : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = clientErrorMessage(
            errorData,
            response.status === 401
              ? 'Please sign in again to analyse your photos.'
              : response.status === 429
                ? 'Photo analysis is busy. Please try again shortly.'
                : 'We could not analyse this photo. Try a clearer image or continue with a written description.'
          );
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setAssessment(data);
        return data;
      } catch (error) {
        logger.error('Error assessing building damage', error, {
          service: 'building-assessment',
        });

        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to analyse building damage. Please try again.';

        setAssessmentError(errorMessage);
        if (onError) onError(errorMessage);
        return null;
      } finally {
        setIsAssessing(false);
      }
    },
    [onError]
  );

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
