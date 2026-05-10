'use client';

import { BUDGET_RANGES, URGENCY_OPTIONS } from '../templates';

export interface QuickJobFormData {
  title: string;
  description: string;
  category: string;
  budget: string;
  urgency: string;
  property_id: string;
}

interface Props {
  formData: QuickJobFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuickJobFormData>>;
  isSubmitting: boolean;
  propertiesLoading: boolean;
  primaryPropertyMissing: boolean;
  hasPropertiesError: boolean;
  onSubmit: () => void;
  onUseDetailedForm: () => void;
}

/**
 * Title + description + budget + urgency + submit. Extracted from
 * `quick-create/page.tsx` on 2026-05-09 for AUDIT_PUNCH_LIST P2 #41.
 *
 * The 5-character title minimum mirrors the validator in
 * `./utils/validation.ts` — keep them aligned if you change either.
 */
export function QuickJobForm({
  formData,
  setFormData,
  isSubmitting,
  propertiesLoading,
  primaryPropertyMissing,
  hasPropertiesError,
  onSubmit,
  onUseDetailedForm,
}: Props) {
  const titleTooShort =
    formData.title.length > 0 && formData.title.trim().length < 5;
  const submitDisabled =
    isSubmitting ||
    !formData.title ||
    formData.title.trim().length < 5 ||
    propertiesLoading ||
    (primaryPropertyMissing && hasPropertiesError);

  return (
    <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-4'>
        Describe Your Issue
      </h2>

      {/* Title */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          What needs fixing?
        </label>
        <input
          type='text'
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder='e.g., Leaking kitchen tap'
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
            titleTooShort
              ? 'border-amber-500 bg-amber-50/50'
              : 'border-gray-300'
          }`}
          aria-invalid={titleTooShort}
          aria-describedby={titleTooShort ? 'title-hint' : undefined}
        />
        {titleTooShort && (
          <p id='title-hint' className='mt-1 text-sm text-amber-700'>
            Use at least 5 characters (e.g. &quot;Leaking kitchen tap&quot;)
          </p>
        )}
      </div>

      {/* Description */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Brief description (optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder='Add any helpful details...'
          rows={3}
          className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
        />
      </div>

      {/* Budget Range */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Estimated Budget
        </label>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
          {BUDGET_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() =>
                setFormData((prev) => ({ ...prev, budget: range.value }))
              }
              className={`py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                formData.budget === range.value
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Urgency */}
      <div className='mb-6'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          When do you need this done?
        </label>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
          {URGENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() =>
                setFormData((prev) => ({ ...prev, urgency: option.value }))
              }
              className={`py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                formData.urgency === option.value
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={submitDisabled}
        className='w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
      >
        {isSubmitting
          ? 'Posting Job...'
          : propertiesLoading
            ? 'Loading property…'
            : primaryPropertyMissing && hasPropertiesError
              ? 'Load your property first'
              : 'Post Job'}
      </button>

      <div className='mt-4 text-center'>
        <p className='text-sm text-gray-600'>
          Need more options?{' '}
          <button
            onClick={onUseDetailedForm}
            className='text-teal-600 hover:text-teal-700 font-medium'
          >
            Use detailed form
          </button>
        </p>
      </div>
    </div>
  );
}
