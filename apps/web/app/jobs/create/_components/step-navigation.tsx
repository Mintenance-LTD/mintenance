import React from 'react';

/**
 * Job-creation step navigation — Direction A · Mint Editorial.
 * Back / Cancel + Next / Post-job buttons on the `.btn` primitives.
 */

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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {currentStep > 1 ? (
        <button
          onClick={onBack}
          className='btn btn-secondary btn-lg'
          data-testid='back-button'
        >
          Back
        </button>
      ) : (
        <button
          onClick={onCancel}
          className='btn btn-secondary btn-lg'
          data-testid='cancel-button'
        >
          Cancel
        </button>
      )}

      {currentStep < totalSteps ? (
        <button
          onClick={onNext}
          disabled={!canProceedNext}
          className='btn btn-primary btn-lg'
          style={{
            opacity: canProceedNext ? 1 : 0.5,
            cursor: canProceedNext ? 'pointer' : 'not-allowed',
          }}
          data-testid='next-button'
        >
          Next
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className='btn btn-primary btn-lg'
          style={{ opacity: isSubmitting ? 0.5 : 1 }}
          data-testid='submit-button'
        >
          {isSubmitting ? 'Posting…' : 'Post job'}
        </button>
      )}
    </div>
  );
}
