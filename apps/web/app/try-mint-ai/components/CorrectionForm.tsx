'use client';

import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { AssessmentResult, CorrectionData } from './TryMintAIClient';

interface CorrectionFormProps {
  result: AssessmentResult;
  correctionState: CorrectionData;
  onCorrectionStateChange: (state: CorrectionData) => void;
  onSubmit: (corrections: CorrectionData['corrections']) => void;
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const inputStyle: React.CSSProperties = {
  background: 'var(--me-surface)',
  color: 'var(--me-ink)',
  border: '1px solid var(--me-line)',
  borderRadius: 'var(--me-radius-input)',
};

export function CorrectionForm({
  result,
  correctionState,
  onCorrectionStateChange,
  onSubmit,
}: CorrectionFormProps) {
  const [formData, setFormData] = useState(correctionState.corrections);

  const issueOptions = [
    { id: 'damage-type', label: 'Damage Type' },
    { id: 'severity', label: 'Severity Level' },
    { id: 'cost', label: 'Cost Estimate' },
  ];

  const handleIssueToggle = (issueId: string) => {
    const newIssues = correctionState.selectedIssues.includes(issueId)
      ? correctionState.selectedIssues.filter((id) => id !== issueId)
      : [...correctionState.selectedIssues, issueId];

    onCorrectionStateChange({
      ...correctionState,
      selectedIssues: newIssues,
    });
  };

  const handleFormChange = (field: string, value: string | number | File[]) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClose = () => {
    onCorrectionStateChange({
      ...correctionState,
      isOpen: false,
    });
  };

  return (
    <MotionDiv
      variants={fadeIn}
      initial='hidden'
      animate='visible'
      transition={{ duration: 0.3 }}
      className='mb-16'
    >
      <div
        className='p-8 sm:p-12'
        style={{
          background: 'var(--me-surface)',
          borderRadius: 'var(--me-radius-card)',
          boxShadow: 'var(--me-shadow-pop)',
          border: '2px solid var(--me-warn-fg)',
        }}
      >
        <div className='flex justify-between items-start mb-6'>
          <h2
            className='text-2xl'
            style={{
              color: 'var(--me-ink)',
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
            }}
          >
            Help Improve Mint AI
          </h2>
          <button
            onClick={handleClose}
            className='p-2 transition-colors focus:outline-none focus:ring-2'
            style={{ borderRadius: 'var(--me-radius-input)' }}
            aria-label='Close correction form'
          >
            <X
              className='w-6 h-6'
              style={{ color: 'var(--me-ink-2)' }}
              aria-hidden='true'
            />
          </button>
        </div>

        <p className='mb-6' style={{ color: 'var(--me-ink-2)' }}>
          Your feedback helps us train our AI to provide more accurate
          assessments. Please tell us what was incorrect.
        </p>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Issue selection */}
          <div>
            <fieldset>
              <legend
                className='text-lg font-semibold mb-4'
                style={{ color: 'var(--me-ink)' }}
              >
                What was incorrect?
              </legend>
              <div className='space-y-3'>
                {issueOptions.map((option) => (
                  <label
                    key={option.id}
                    className='flex items-center gap-3 p-4 cursor-pointer transition-colors'
                    style={{
                      border: '2px solid var(--me-line)',
                      borderRadius: 'var(--me-radius-input)',
                    }}
                  >
                    <input
                      type='checkbox'
                      checked={correctionState.selectedIssues.includes(
                        option.id
                      )}
                      onChange={() => handleIssueToggle(option.id)}
                      className='w-5 h-5 rounded'
                      style={{ accentColor: 'var(--me-brand)' }}
                    />
                    <span
                      className='font-medium'
                      style={{ color: 'var(--me-ink)' }}
                    >
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Conditional correction inputs */}
          {correctionState.selectedIssues.includes('damage-type') && (
            <div>
              <label
                htmlFor='correct-damage-type'
                className='block text-sm font-medium mb-2'
                style={{ color: 'var(--me-ink-2)' }}
              >
                Correct Damage Type
              </label>
              <input
                id='correct-damage-type'
                type='text'
                value={formData.damageType || ''}
                onChange={(e) => handleFormChange('damageType', e.target.value)}
                placeholder='e.g., Roof leak, Foundation crack'
                className='w-full px-4 py-3 focus:outline-none focus:ring-2'
                style={inputStyle}
              />
            </div>
          )}

          {correctionState.selectedIssues.includes('severity') && (
            <div>
              <label
                htmlFor='correct-severity'
                className='block text-sm font-medium mb-2'
                style={{ color: 'var(--me-ink-2)' }}
              >
                Correct Severity Level
              </label>
              <select
                id='correct-severity'
                value={formData.severity || ''}
                onChange={(e) =>
                  handleFormChange(
                    'severity',
                    e.target.value as
                      | 'Early'
                      | 'Developing'
                      | 'Significant'
                      | 'Dangerous'
                  )
                }
                className='w-full px-4 py-3 focus:outline-none focus:ring-2'
                style={inputStyle}
              >
                <option value=''>Select severity</option>
                <option value='Early'>Early — cosmetic/minor</option>
                <option value='Developing'>Developing — progressing</option>
                <option value='Significant'>
                  Significant — serious, repair soon
                </option>
                <option value='Dangerous'>
                  Dangerous — urgent/safety risk
                </option>
              </select>
            </div>
          )}

          {correctionState.selectedIssues.includes('cost') && (
            <div>
              <label
                htmlFor='correct-cost'
                className='block text-sm font-medium mb-2'
                style={{ color: 'var(--me-ink-2)' }}
              >
                Correct Cost Estimate (£)
              </label>
              <input
                id='correct-cost'
                type='number'
                min='0'
                step='50'
                value={formData.costEstimate || ''}
                onChange={(e) =>
                  handleFormChange('costEstimate', parseInt(e.target.value))
                }
                placeholder='e.g., 500'
                className='w-full px-4 py-3 focus:outline-none focus:ring-2'
                style={inputStyle}
              />
            </div>
          )}

          {/* Additional notes */}
          <div>
            <label
              htmlFor='correction-notes'
              className='block text-sm font-medium mb-2'
              style={{ color: 'var(--me-ink-2)' }}
            >
              Additional Notes (Optional)
            </label>
            <textarea
              id='correction-notes'
              rows={4}
              value={formData.notes || ''}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder='Please provide any additional context that might help...'
              className='w-full px-4 py-3 focus:outline-none focus:ring-2'
              style={inputStyle}
            />
          </div>

          {/* Additional photos */}
          <div>
            <label
              className='block text-sm font-medium mb-2'
              style={{ color: 'var(--me-ink-2)' }}
            >
              Upload Additional Photos (Optional)
            </label>
            <div
              className='p-6 text-center transition-colors'
              style={{
                border: '2px dashed var(--me-line)',
                borderRadius: 'var(--me-radius-input)',
              }}
            >
              <input
                type='file'
                accept='image/*'
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleFormChange('additionalImages', files);
                }}
                className='sr-only'
                id='additional-photos'
              />
              <label
                htmlFor='additional-photos'
                className='cursor-pointer flex flex-col items-center gap-2'
              >
                <Upload
                  className='w-10 h-10'
                  style={{ color: 'var(--me-ink-3)' }}
                  aria-hidden='true'
                />
                <span style={{ color: 'var(--me-ink-2)' }}>
                  Click to upload more photos
                </span>
                <span className='text-sm' style={{ color: 'var(--me-ink-3)' }}>
                  {formData.additionalImages?.length
                    ? `${formData.additionalImages.length} file(s) selected`
                    : 'JPG, PNG up to 10MB'}
                </span>
              </label>
            </div>
          </div>

          {/* Submit buttons */}
          <div className='flex gap-4 pt-4'>
            <button
              type='submit'
              disabled={correctionState.selectedIssues.length === 0}
              className='flex-1 px-6 py-3 font-semibold transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
              style={{
                background:
                  'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
                color: 'var(--me-on-brand)',
                borderRadius: 'var(--me-radius-input)',
              }}
            >
              Submit Correction
            </button>
            <button
              type='button'
              onClick={handleClose}
              className='px-6 py-3 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
              style={{
                background: 'var(--me-bg-2)',
                color: 'var(--me-ink-2)',
                borderRadius: 'var(--me-radius-input)',
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        <p
          className='text-sm mt-6 text-center'
          style={{ color: 'var(--me-ink-2)' }}
        >
          Your corrections are reviewed by our team and used to improve the AI
          model. Thank you for contributing!
        </p>
      </div>
    </MotionDiv>
  );
}
