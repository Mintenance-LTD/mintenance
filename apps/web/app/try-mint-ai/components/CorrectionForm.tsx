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
      ? correctionState.selectedIssues.filter(id => id !== issueId)
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
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
      className="mb-16"
    >
      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 border-2 border-amber-200">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Help Improve Mint AI
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close correction form"
          >
            <X className="w-6 h-6 text-gray-600" aria-hidden="true" />
          </button>
        </div>

        <p className="text-gray-700 mb-6">
          Your feedback helps us train our AI to provide more accurate assessments. Please tell us what was incorrect.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue selection */}
          <div>
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4">
                What was incorrect?
              </legend>
              <div className="space-y-3">
                {issueOptions.map(option => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-teal-300 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={correctionState.selectedIssues.includes(option.id)}
                      onChange={() => handleIssueToggle(option.id)}
                      className="w-5 h-5 text-teal-600 focus:ring-teal-500 rounded"
                    />
                    <span className="text-gray-900 font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Conditional correction inputs */}
          {correctionState.selectedIssues.includes('damage-type') && (
            <div>
              <label htmlFor="correct-damage-type" className="block text-sm font-medium text-gray-700 mb-2">
                Correct Damage Type
              </label>
              <input
                id="correct-damage-type"
                type="text"
                value={formData.damageType || ''}
                onChange={(e) => handleFormChange('damageType', e.target.value)}
                placeholder="e.g., Roof leak, Foundation crack"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}

          {correctionState.selectedIssues.includes('severity') && (
            <div>
              <label htmlFor="correct-severity" className="block text-sm font-medium text-gray-700 mb-2">
                Correct Severity Level
              </label>
              <select
                id="correct-severity"
                value={formData.severity || ''}
                onChange={(e) => handleFormChange('severity', e.target.value as 'Minor' | 'Moderate' | 'Severe')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select severity</option>
                <option value="Minor">Minor</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
            </div>
          )}

          {correctionState.selectedIssues.includes('cost') && (
            <div>
              <label htmlFor="correct-cost" className="block text-sm font-medium text-gray-700 mb-2">
                Correct Cost Estimate (£)
              </label>
              <input
                id="correct-cost"
                type="number"
                min="0"
                step="50"
                value={formData.costEstimate || ''}
                onChange={(e) => handleFormChange('costEstimate', parseInt(e.target.value))}
                placeholder="e.g., 500"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}

          {/* Additional notes */}
          <div>
            <label htmlFor="correction-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              id="correction-notes"
              rows={4}
              value={formData.notes || ''}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder="Please provide any additional context that might help..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Additional photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Additional Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  handleFormChange('additionalImages', files);
                }}
                className="sr-only"
                id="additional-photos"
              />
              <label
                htmlFor="additional-photos"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-10 h-10 text-gray-400" aria-hidden="true" />
                <span className="text-gray-600">Click to upload more photos</span>
                <span className="text-sm text-gray-500">
                  {formData.additionalImages?.length
                    ? `${formData.additionalImages.length} file(s) selected`
                    : 'JPG, PNG up to 10MB'}
                </span>
              </label>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={correctionState.selectedIssues.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Submit Correction
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Your corrections are reviewed by our team and used to improve the AI model. Thank you for contributing!
        </p>
      </div>
    </MotionDiv>
  );
}
