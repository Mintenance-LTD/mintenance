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

export interface AssessmentResult {
  damageType: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  costEstimate: {
    min: number;
    max: number;
  };
  confidence: number;
  details: {
    description: string;
    urgency: string;
    safetyRisk: string;
    recommendations: string[];
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

      // Transform API response to our format
      const assessment: AssessmentResult = {
        damageType: result.damageAssessment?.damageType || 'Unknown',
        severity: mapSeverity(result.damageAssessment?.severity || 50),
        costEstimate: {
          min: result.costEstimate?.min || 100,
          max: result.costEstimate?.max || 500,
        },
        confidence: result.damageAssessment?.confidence || 75,
        details: {
          description: result.damageAssessment?.description || 'Assessment completed',
          urgency: result.urgency?.urgency || 'monitor',
          safetyRisk: result.safetyHazards?.overallSafetyScore > 70 ? 'Low' : 'High',
          recommendations: result.recommendations || [
            'Professional inspection recommended',
            'Monitor for changes',
          ],
        },
      };

      setAssessmentResult(assessment);
      setUploadState('complete');
    } catch (error) {
      logger.error('Assessment error in demo', { error, service: 'mint-ai-demo' });
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      setUploadState('error');
    }
  };

  const handleAccuracyFeedback = (isAccurate: boolean) => {
    if (!isAccurate) {
      setCorrectionState({
        ...correctionState,
        isOpen: true,
      });
    } else {
      // Log positive feedback
      logger.info('User confirmed assessment accuracy', { service: 'mint-ai-demo' });
    }
  };

  const handleCorrectionSubmit = async (corrections: CorrectionData['corrections']) => {
    try {
      // Submit corrections to the API for learning
      await fetch('/api/building-surveyor/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId: 'demo',
          corrections,
          selectedIssues: correctionState.selectedIssues,
        }),
      });

      // Close correction form
      setCorrectionState({
        isOpen: false,
        selectedIssues: [],
        corrections: {},
      });

      // Show thank you message
      alert('Thank you for helping improve Mint AI!');
    } catch (error) {
      logger.error('Failed to submit corrections', { error, service: 'mint-ai-demo' });
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
