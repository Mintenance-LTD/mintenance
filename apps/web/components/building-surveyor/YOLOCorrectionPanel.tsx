'use client';

/**
 * YOLO Correction Panel
 * 
 * Wrapper component that manages correction state and API calls
 */

import React, { useState } from 'react';
import { YOLOCorrectionEditor, type CorrectedDetection } from './YOLOCorrectionEditor';
import type { RoboflowDetection } from '@/lib/services/building-surveyor/types';

interface YOLOCorrectionPanelProps {
  assessmentId: string;
  imageUrls: string[];
  originalDetections: RoboflowDetection[];
  onComplete?: () => void;
}

/**
 * YOLO Correction Panel
 */
export function YOLOCorrectionPanel({
  assessmentId,
  imageUrls,
  originalDetections,
  onComplete,
}: YOLOCorrectionPanelProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [corrections, setCorrections] = useState<Map<number, CorrectedDetection[]>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  const currentImageUrl = imageUrls[currentImageIndex];
  const currentImageDetections = originalDetections.filter(
    det => det.imageUrl === currentImageUrl
  );
  const currentCorrections = corrections.get(currentImageIndex) || [];

  // Handle save for current image
  const handleSave = async (detections: CorrectedDetection[]) => {
    setCorrections(new Map(corrections.set(currentImageIndex, detections)));

    try {
      setIsSubmitting(true);

      // Calculate corrections made
      const correctionsMade = {
        added: detections.filter(d => d.id.startsWith('new-')),
        removed: currentImageDetections.filter(
          orig => !detections.find(d => d.id === orig.id)
        ),
        adjusted: detections
          .filter(d => !d.id.startsWith('new-'))
          .filter(d => {
            const orig = currentImageDetections.find(o => o.id === d.id);
            if (!orig) return false;
            return (
              orig.className !== d.class ||
              orig.boundingBox.x !== d.bbox.x ||
              orig.boundingBox.y !== d.bbox.y ||
              orig.boundingBox.width !== d.bbox.width ||
              orig.boundingBox.height !== d.bbox.height
            );
          }),
      };

      // Convert to RoboflowDetection format for API
      const correctedDetections = detections.map(det => ({
        id: det.id,
        className: det.class,
        confidence: (det.confidence || 0.5) * 100,
        boundingBox: {
          x: det.bbox.x,
          y: det.bbox.y,
          width: det.bbox.width,
          height: det.bbox.height,
        },
        imageUrl: currentImageUrl,
      }));

      // Submit correction
      const response = await fetch('/api/building-surveyor/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId,
          imageUrl: currentImageUrl,
          imageIndex: currentImageIndex,
          originalDetections: currentImageDetections,
          correctedDetections,
          correctionsMade,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to submit correction');
      }

      setSubmittedCount(submittedCount + 1);

      // Move to next image if available
      if (currentImageIndex < imageUrls.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      } else {
        // All images corrected
        onComplete?.();
      }
    } catch (error) {
      console.error('Failed to submit correction:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit correction');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Image {currentImageIndex + 1} of {imageUrls.length}
          </span>
          <span className="text-sm text-blue-700">
            {submittedCount} correction{submittedCount !== 1 ? 's' : ''} submitted
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentImageIndex + 1) / imageUrls.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Editor */}
      <YOLOCorrectionEditor
        assessmentId={assessmentId}
        imageUrl={currentImageUrl}
        imageIndex={currentImageIndex}
        originalDetections={currentImageDetections}
        onSave={handleSave}
        onCancel={
          currentImageIndex > 0
            ? () => setCurrentImageIndex(currentImageIndex - 1)
            : undefined
        }
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
          disabled={currentImageIndex === 0}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous Image
        </button>

        <div className="flex gap-2">
          {imageUrls.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full ${
                index === currentImageIndex
                  ? 'bg-blue-600'
                  : corrections.has(index)
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
              title={`Image ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentImageIndex(Math.min(imageUrls.length - 1, currentImageIndex + 1))}
          disabled={currentImageIndex === imageUrls.length - 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Image
        </button>
      </div>
    </div>
  );
}

