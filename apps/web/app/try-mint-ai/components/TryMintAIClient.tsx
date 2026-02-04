'use client';

import React, { useState } from 'react';
import { HeroSection } from './HeroSection';
import { UploadSection } from './UploadSection';
import { AssessmentResults } from './AssessmentResults';
import { CorrectionForm } from './CorrectionForm';
import { HowItWorksSection } from './HowItWorksSection';
import { FeaturesGrid } from './FeaturesGrid';
import { CTASection } from './CTASection';
import { logger } from '@mintenance/shared';

export type UploadState = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

export interface Material {
  name: string;
  quantity: string;
  estimatedCost: number;
  // Database enrichment fields
  material_id?: string;
  unit_price?: number;
  total_cost?: number;
  source?: 'ai' | 'database';
  sku?: string;
  supplier_name?: string;
  unit?: string;
}

export interface AssessmentResult {
  damageType: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  costEstimate: {
    min: number;
    max: number;
  };
  confidence: number;
  assessmentId?: string; // NEW: For training feedback
  details: {
    description: string;
    urgency: string;
    safetyRisk: string;
    recommendations: string[];
    materials?: Material[]; // Materials needed for repair
  };
}

export interface CorrectionData {
  isOpen: boolean;
  selectedIssues: string[];
  corrections: {
    damageType?: string;
    severity?: 'Minor' | 'Moderate' | 'Severe';
    costEstimate?: number;
    notes?: string;
    additionalImages?: File[];
  };
}

export function TryMintAIClient() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [correctionState, setCorrectionState] = useState<CorrectionData>({
    isOpen: false,
    selectedIssues: [],
    corrections: {},
  });
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleImagesSelected = (files: File[]) => {
    setUploadedImages(files);
    setUploadState('idle');
    setAssessmentResult(null);
    setErrorMessage('');
  };

  const handleAnalyze = async () => {
    if (uploadedImages.length === 0) {
      setErrorMessage('Please upload at least one image');
      return;
    }

    setUploadState('uploading');
    setErrorMessage('');

    try {
      // Upload images to storage
      const imageUrls: string[] = [];

      for (const file of uploadedImages) {
        // Convert to base64 for demo (in production, upload to Supabase storage)
        const base64 = await fileToBase64(file);
        imageUrls.push(base64);
      }

      setUploadState('analyzing');

      // Call the assessment API
      const response = await fetch('/api/building-surveyor/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrls,
          context: {
            propertyType: 'residential',
            ageOfProperty: 50,
            location: 'UK',
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw new Error('Assessment failed. Please try again.');
      }

      const result = await response.json();

      // Log received data for debugging
      logger.info('Demo API response received', {
        service: 'mint-ai-demo',
        hasAssessmentId: !!result.assessmentId,
        assessmentId: result.assessmentId,
        materialsCount: result.materials?.length || 0,
      });

      // Transform API response to our format
      const assessment: AssessmentResult = {
        damageType: result.damageAssessment?.damageType || 'Unknown',
        severity: mapSeverity(result.damageAssessment?.severity || 50),
        costEstimate: {
          min: result.costEstimate?.min || 100,
          max: result.costEstimate?.max || 500,
        },
        confidence: result.damageAssessment?.confidence || 75,
        assessmentId: result.assessmentId || null, // NEW: Store for training feedback
        details: {
          description: result.damageAssessment?.description || 'Assessment completed',
          urgency: result.urgency?.urgency || 'monitor',
          safetyRisk: result.safetyHazards?.overallSafetyScore > 70 ? 'Low' : 'High',
          recommendations: result.recommendations || [
            'Professional inspection recommended',
            'Monitor for changes',
          ],
          materials: result.materials || [], // Materials from database-enriched assessment
        },
      };

      // Log what we're setting in state
      logger.info('Setting assessment result in state', {
        service: 'mint-ai-demo',
        hasAssessmentId: !!assessment.assessmentId,
        assessmentId: assessment.assessmentId,
      });

      setAssessmentResult(assessment);
      setUploadState('complete');
    } catch (error) {
      logger.error('Assessment error in demo', { error, service: 'mint-ai-demo' });
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      setUploadState('error');
    }
  };

  const handleAccuracyFeedback = async (isAccurate: boolean) => {
    // Debug: Log current state when button is clicked
    logger.info('Feedback button clicked', {
      service: 'mint-ai-demo',
      isAccurate,
      hasAssessmentResult: !!assessmentResult,
      assessmentId: assessmentResult?.assessmentId,
    });

    if (!assessmentResult?.assessmentId) {
      logger.warn('No assessment ID available for feedback', { service: 'mint-ai-demo' });
      alert('Unable to submit feedback at this time');
      return;
    }

    if (!isAccurate) {
      // Open correction form for detailed feedback
      setCorrectionState({
        ...correctionState,
        isOpen: true,
      });
    } else {
      // Submit positive feedback to API
      try {
        const response = await fetch('/api/building-surveyor/demo-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId: assessmentResult.assessmentId,
            isAccurate: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit feedback');
        }

        const result = await response.json();
        logger.info('User confirmed assessment accuracy', {
          service: 'mint-ai-demo',
          assessmentId: assessmentResult.assessmentId
        });

        alert(result.message || 'Thank you for confirming the accuracy!');
      } catch (error) {
        logger.error('Failed to submit positive feedback', { error, service: 'mint-ai-demo' });
        alert('Failed to submit feedback. Please try again.');
      }
    }
  };

  const handleCorrectionSubmit = async (corrections: CorrectionData['corrections']) => {
    if (!assessmentResult?.assessmentId) {
      logger.warn('No assessment ID available for corrections', { service: 'mint-ai-demo' });
      alert('Unable to submit corrections at this time');
      return;
    }

    try {
      // Submit corrections to the training feedback API
      const response = await fetch('/api/building-surveyor/demo-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId: assessmentResult.assessmentId,
          isAccurate: false,
          correctedDamageType: corrections.damageType,
          correctedSeverity: corrections.severity?.toLowerCase(), // Convert to backend format
          correctedCostMin: corrections.costEstimate ? corrections.costEstimate * 0.8 : undefined,
          correctedCostMax: corrections.costEstimate ? corrections.costEstimate * 1.2 : undefined,
          correctionNotes: corrections.notes,
          feedbackText: correctionState.selectedIssues.join(', '),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit corrections');
      }

      const result = await response.json();

      // Close correction form
      setCorrectionState({
        isOpen: false,
        selectedIssues: [],
        corrections: {},
      });

      // Show thank you message
      alert(result.message || 'Thank you for helping improve Mint AI!');

      logger.info('User submitted corrections', {
        service: 'mint-ai-demo',
        assessmentId: assessmentResult.assessmentId
      });
    } catch (error) {
      logger.error('Failed to submit corrections', { error, service: 'mint-ai-demo' });
      alert('Failed to submit corrections. Please try again.');
    }
  };

  return (
    <div className="bg-gray-50">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <UploadSection
          uploadState={uploadState}
          uploadedImages={uploadedImages}
          onImagesSelected={handleImagesSelected}
          onAnalyze={handleAnalyze}
          errorMessage={errorMessage}
        />

        {assessmentResult && (
          <AssessmentResults
            result={assessmentResult}
            onAccuracyFeedback={handleAccuracyFeedback}
          />
        )}

        {correctionState.isOpen && assessmentResult && (
          <CorrectionForm
            result={assessmentResult}
            correctionState={correctionState}
            onCorrectionStateChange={setCorrectionState}
            onSubmit={handleCorrectionSubmit}
          />
        )}
      </div>

      <HowItWorksSection />
      <FeaturesGrid />
      <CTASection />
    </div>
  );
}

// Helper functions
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

function mapSeverity(severityScore: number): 'Minor' | 'Moderate' | 'Severe' {
  if (severityScore < 30) return 'Minor';
  if (severityScore < 70) return 'Moderate';
  return 'Severe';
}
