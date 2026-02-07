import React from 'react';
import Image from 'next/image';
import { URGENCY_OPTIONS } from './types';
import type { Property, ImagePreviewItem, BuildingAssessmentData, JobFormData } from './types';

interface ReviewStepProps {
  formData: JobFormData;
  selectedProperty: Property | undefined;
  imagePreviews: ImagePreviewItem[];
  assessment: BuildingAssessmentData | null;
  onEditStep: (step: number) => void;
}

export function ReviewStep({
  formData,
  selectedProperty,
  imagePreviews,
  assessment,
  onEditStep,
}: ReviewStepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Review and post your job</h1>
        <p className="text-gray-600">Make sure everything looks good before posting</p>
      </div>

      {/* Summary Card */}
      <div className="space-y-6">
        {/* Property & Category */}
        <PropertySummary
          selectedProperty={selectedProperty}
          onEdit={() => onEditStep(1)}
        />

        {/* Job Details */}
        <JobDetailsSummary
          formData={formData}
          onEdit={() => onEditStep(1)}
        />

        {/* Photos */}
        {imagePreviews.length > 0 && (
          <PhotosSummary
            imagePreviews={imagePreviews}
            onEdit={() => onEditStep(2)}
          />
        )}

        {/* Budget & Timeline */}
        <BudgetSummary
          formData={formData}
          onEdit={() => onEditStep(3)}
        />

        {/* AI Assessment Summary */}
        {assessment && (
          <AssessmentSummary
            assessment={assessment}
            onViewDetails={() => onEditStep(2)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function PropertySummary({
  selectedProperty,
  onEdit,
}: {
  selectedProperty: Property | undefined;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
      {selectedProperty && (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          {selectedProperty.photos?.[0] ? (
            <Image
              src={selectedProperty.photos[0]}
              alt={selectedProperty.property_name || 'Property'}
              fill
              className="object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-property.svg';
              }}
            />
          ) : (
            <Image
              src="/placeholder-property.svg"
              alt="Property placeholder"
              fill
              className="object-cover"
            />
          )}
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Property</h3>
        <p className="text-lg font-semibold text-gray-900">
          {selectedProperty?.property_name || 'Property'}
        </p>
        <p className="text-sm text-gray-600 mt-1">{selectedProperty?.address}</p>
      </div>
      <button
        onClick={onEdit}
        className="text-sm text-teal-600 font-medium hover:text-teal-700"
      >
        Edit
      </button>
    </div>
  );
}

function JobDetailsSummary({
  formData,
  onEdit,
}: {
  formData: JobFormData;
  onEdit: () => void;
}) {
  return (
    <div className="pb-6 border-b border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Job title</h3>
          <p className="text-lg font-semibold text-gray-900">{formData.title}</p>
        </div>
        <button
          onClick={onEdit}
          className="text-sm text-teal-600 font-medium hover:text-teal-700"
        >
          Edit
        </button>
      </div>
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
        <p className="text-base text-gray-900 capitalize">{formData.category}</p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
        <p className="text-base text-gray-900 whitespace-pre-wrap">{formData.description}</p>
      </div>
    </div>
  );
}

function PhotosSummary({
  imagePreviews,
  onEdit,
}: {
  imagePreviews: ImagePreviewItem[];
  onEdit: () => void;
}) {
  return (
    <div className="pb-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">
          Photos ({imagePreviews.length})
        </h3>
        <button
          onClick={onEdit}
          className="text-sm text-teal-600 font-medium hover:text-teal-700"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {imagePreviews.slice(0, 4).map((previewItem, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={previewItem.preview}
              alt={`Photo ${index + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetSummary({
  formData,
  onEdit,
}: {
  formData: JobFormData;
  onEdit: () => void;
}) {
  return (
    <div className="pb-6 border-b border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-medium text-gray-500">Budget & Timeline</h3>
        <button
          onClick={onEdit}
          className="text-sm text-teal-600 font-medium hover:text-teal-700"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Budget</h4>
          <p className="text-2xl font-bold text-gray-900">£{formData.budget || '0'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Urgency</h4>
          <p className="text-base font-semibold text-gray-900 capitalize">
            {URGENCY_OPTIONS.find(o => o.value === formData.urgency)?.label || formData.urgency}
          </p>
        </div>
      </div>
    </div>
  );
}

function AssessmentSummary({
  assessment,
  onViewDetails,
}: {
  assessment: BuildingAssessmentData;
  onViewDetails: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">Mint AI Assessment</h3>
        <button
          onClick={onViewDetails}
          className="text-sm text-teal-600 font-medium hover:text-teal-700"
        >
          View Details
        </button>
      </div>
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-5 border-2 border-teal-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            AI
          </div>
          <div className="flex-1">
            <div className="text-base font-bold text-gray-900">
              {assessment.damageAssessment.damageType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div className="text-sm text-gray-600">
              Severity: <span className="font-medium capitalize">{assessment.damageAssessment.severity}</span> · {assessment.damageAssessment.confidence}% confidence
            </div>
          </div>
          {assessment.safetyHazards.hasSafetyHazards && (
            <div className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold">
              Safety Alert
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {assessment.damageAssessment.description}
        </p>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Urgency */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xs font-semibold text-gray-500 mb-1">Urgency</div>
            <div className="text-sm font-bold text-gray-900 capitalize">{assessment.urgency.urgency}</div>
            <div className="text-xs text-gray-600 mt-0.5">{assessment.urgency.reasoning}</div>
          </div>

          {/* Estimated Cost */}
          {assessment.estimatedCost && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-xs font-semibold text-gray-500 mb-1">Estimated Cost</div>
              <div className="text-sm font-bold text-gray-900">
                £{Math.round(assessment.estimatedCost.min).toLocaleString()} - £{Math.round(assessment.estimatedCost.max).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{assessment.estimatedCost.confidence}% confidence</div>
            </div>
          )}

          {/* Compliance */}
          {assessment.compliance && (
            <div className={`bg-white rounded-lg p-3 border border-gray-200 ${!assessment.estimatedCost ? '' : 'col-span-2'}`}>
              <div className="text-xs font-semibold text-gray-500 mb-1">Compliance Score</div>
              <div className="text-sm font-bold text-gray-900">{assessment.compliance.complianceScore}%</div>
              {assessment.compliance.flags.length > 0 && (
                <div className="text-xs text-amber-700 mt-0.5">{assessment.compliance.flags.join(', ')}</div>
              )}
            </div>
          )}
        </div>

        {/* Safety Hazards */}
        {assessment.safetyHazards.hasSafetyHazards && assessment.safetyHazards.criticalFlags.length > 0 && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <div className="text-xs font-bold text-rose-900 mb-1">Safety Hazards</div>
            <div className="text-xs text-rose-700">{assessment.safetyHazards.criticalFlags.join(', ')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
