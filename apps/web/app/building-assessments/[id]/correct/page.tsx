/**
 * Building Assessment Correction Page
 * 
 * Allows users to correct YOLO detections for continuous learning
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { YOLOCorrectionPanel } from '@/components/building-surveyor/YOLOCorrectionPanel';
import type { RoboflowDetection } from '@/lib/services/building-surveyor/types';

export default function CorrectAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params?.id as string;
  
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [originalDetections, setOriginalDetections] = useState<RoboflowDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssessmentData() {
      try {
        setLoading(true);
        
        // Fetch assessment data
        const response = await fetch(`/api/building-assessments/${assessmentId}`);
        if (!response.ok) {
          throw new Error('Failed to load assessment');
        }
        
        const data = await response.json();
        
        // Get images
        const images = data.images || [];
        setImageUrls(images.map((img: any) => img.image_url));
        
        // Get original detections
        const assessmentData = data.assessment_data || {};
        const detections = assessmentData.evidence?.roboflowDetections || [];
        setOriginalDetections(detections);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load assessment');
      } finally {
        setLoading(false);
      }
    }

    if (assessmentId) {
      loadAssessmentData();
    }
  }, [assessmentId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (imageUrls.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Images Found</h1>
          <p className="text-gray-600">This assessment has no images to correct.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Correct Detections</h1>
          <p className="text-gray-600">
            Help improve the AI by correcting detection errors. Your corrections will be used to
            train better models.
          </p>
        </div>

        <YOLOCorrectionPanel
          assessmentId={assessmentId}
          imageUrls={imageUrls}
          originalDetections={originalDetections}
          onComplete={() => {
            router.push(`/building-assessments/${assessmentId}`);
          }}
        />
      </div>
    </div>
  );
}

