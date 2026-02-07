import React from 'react';

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceedNext: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  canProceedNext,
  isSubmitting,
  onBack,
  onNext,
  onCancel,
  onSubmit,
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between">
      {currentStep > 1 ? (
        <button
          onClick={onBack}
          className="px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          data-testid="back-button"
        >
          Back
        </button>
      ) : (
        <button
          onClick={onCancel}
          className="px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          data-testid="cancel-button"
        >
          Cancel
        </button>
      )}

      {currentStep < totalSteps ? (
        <button
          onClick={onNext}
          disabled={!canProceedNext}
          className="px-8 py-3 text-base font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          data-testid="next-button"
        >
          Next
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 text-base font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          data-testid="submit-button"
        >
          {isSubmitting ? 'Posting...' : 'Post Job'}
        </button>
      )}
    </div>
  );
}
