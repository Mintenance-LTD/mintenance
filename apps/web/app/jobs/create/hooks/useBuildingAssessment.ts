'use client';

import { useState, useCallback } from 'react';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { clientErrorMessage } from '@/lib/errors/client-message';

// Validate the fields rendered by the form before accepting an API response.
// Retain additional evidence and identifiers for the existing submission flow.
const safetySchema = z.union([
  z
    .looseObject({
      hazards: z.array(z.looseObject({ description: z.string() })),
      hasCriticalHazards: z.boolean(),
      overallSafetyScore: z.number(),
    })
    .transform((value) => ({
      ...value,
      hasSafetyHazards: value.hasCriticalHazards || value.hazards.length > 0,
      criticalFlags:
        value.hazards.length > 0
          ? value.hazards.map((hazard) => hazard.description)
          : value.hasCriticalHazards
            ? ['Critical hazards reported; professional review required.']
            : [],
    })),
  z.looseObject({
    hasSafetyHazards: z.boolean(),
    overallSafetyScore: z.number(),
    criticalFlags: z.array(z.string()),
  }),
]);
const complianceSchema = z.union([
  z
    .looseObject({
      complianceScore: z.number(),
      complianceIssues: z.array(z.looseObject({ issue: z.string() })),
    })
    .transform((value) => ({
      ...value,
      flags: value.complianceIssues.map((issue) => issue.issue),
    })),
  z.looseObject({ complianceScore: z.number(), flags: z.array(z.string()) }),
]);
const assessmentSchema = z.looseObject({
  damageAssessment: z.looseObject({
    damageType: z.string(),
    severity: z.string(),
    confidence: z.number(),
    description: z.string(),
  }),
  safetyHazards: safetySchema,
  urgency: z.looseObject({ urgency: z.string(), reasoning: z.string() }),
  estimatedCost: z
    .looseObject({
      min: z.number(),
      max: z.number(),
      confidence: z.number(),
    })
    .optional(),
  compliance: complianceSchema.optional(),
  decisionResult: z
    .looseObject({
      decision: z.enum(['automate', 'escalate']),
      reason: z.string().default(''),
      safetyUcb: z.number().optional(),
      rewardUcb: z.number().optional(),
    })
    .optional(),
});
type BuildingAssessmentResult = z.infer<typeof assessmentSchema>;
const invalidAssessmentMessage =
  'Photo analysis returned an incomplete result. Try again or continue with a written description.';

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
      setAssessment(null);
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

        const data: unknown = await response.json().catch(() => {
          throw new Error(invalidAssessmentMessage);
        });
        const parsed = assessmentSchema.safeParse(data);
        if (!parsed.success) throw new Error(invalidAssessmentMessage);
        setAssessment(parsed.data);
        return parsed.data;
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
