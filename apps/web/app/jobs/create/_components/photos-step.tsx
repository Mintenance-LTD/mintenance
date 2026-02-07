import React from 'react';
import Image from 'next/image';
import type { ImagePreviewItem, BuildingAssessmentData } from './types';

interface PhotosStepProps {
  imagePreviews: ImagePreviewItem[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  isAssessing: boolean;
  assessment: BuildingAssessmentData | null;
}

export function PhotosStep({
  imagePreviews,
  onFileChange,
  onRemoveImage,
  isAssessing,
  assessment,
}: PhotosStepProps) {
  return (
    <div className="space-y-8" data-testid="step-2-photos">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Add photos of your project</h1>
        <p className="text-gray-600">Help contractors understand the scope of work (optional)</p>
      </div>

      {/* Drag & Drop Zone */}
      <div>
        <label
          htmlFor="photo-upload"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors bg-gray-50"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-12 h-12 mb-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-base text-gray-700 font-medium">
              <span className="text-teal-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">PNG, JPG, JPEG up to 10MB (max 10 photos)</p>
          </div>
          <input
            id="photo-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/*"
            onChange={onFileChange}
          />
        </label>
      </div>

      {/* Photo Previews */}
      {imagePreviews.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-3">
            Uploaded Photos ({imagePreviews.length}/10)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {imagePreviews.map((previewItem, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <Image
                  src={previewItem.preview}
                  alt={`Preview ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-2 right-2 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Assessment Loading State */}
      {isAssessing && (
        <AssessmentLoadingState />
      )}

      {/* AI Assessment Results */}
      {assessment && !isAssessing && (
        <AssessmentResults assessment={assessment} />
      )}
    </div>
  );
}

function AssessmentLoadingState() {
  return (
    <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">AI Analysis in Progress</h3>
          <p className="text-sm text-gray-600">Analyzing images for damage assessment...</p>
        </div>
      </div>
    </div>
  );
}

interface AssessmentResultsProps {
  assessment: BuildingAssessmentData;
}

function AssessmentResults({ assessment }: AssessmentResultsProps) {
  return (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          AI
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">Building Damage Assessment</h3>
          <p className="text-sm text-gray-600">AI-powered analysis complete</p>
        </div>
        <span className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-full">
          {assessment.damageAssessment.confidence}% Confidence
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-xs font-semibold text-gray-500 mb-1">Damage Type</div>
          <div className="text-base font-bold text-gray-900 capitalize">
            {assessment.damageAssessment.damageType}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-xs font-semibold text-gray-500 mb-1">Severity</div>
          <div className="text-base font-bold text-gray-900 capitalize">
            {assessment.damageAssessment.severity}
          </div>
        </div>

        {assessment.safetyHazards.hasSafetyHazards && (
          <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm font-semibold text-rose-900">Safety Hazards Detected</div>
            </div>
            <div className="text-xs text-rose-700 ml-7">
              {assessment.safetyHazards.criticalFlags.join(', ')}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="text-xs font-semibold text-gray-500 mb-2">Description</div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {assessment.damageAssessment.description}
        </p>
      </div>
    </div>
  );
}
