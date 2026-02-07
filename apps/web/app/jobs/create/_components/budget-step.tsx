import React from 'react';
import { BudgetRangeSelector, type BudgetData } from '../components/BudgetRangeSelector';
import { URGENCY_OPTIONS } from './types';
import type { JobFormData } from './types';

interface BudgetStepProps {
  formData: JobFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobFormData>>;
  hasImages: boolean;
  preferredDate: string;
  setPreferredDate: (date: string) => void;
  aiSuggestedBudget?: { min: number; max: number; confidence: number } | null;
}

export function BudgetStep({
  formData,
  setFormData,
  hasImages,
  preferredDate,
  setPreferredDate,
  aiSuggestedBudget,
}: BudgetStepProps) {
  return (
    <div className="space-y-8" data-testid="step-3-budget">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Set your budget and timeline</h1>
        <p className="text-gray-600">This helps contractors provide accurate quotes</p>
      </div>

      {/* AI Budget Suggestion */}
      {aiSuggestedBudget && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            AI
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Mint AI estimates £{Math.round(aiSuggestedBudget.min).toLocaleString()} - £{Math.round(aiSuggestedBudget.max).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">
              Based on damage assessment ({aiSuggestedBudget.confidence}% confidence). You can adjust below.
            </p>
          </div>
        </div>
      )}

      {/* Budget Range Selector */}
      <BudgetRangeSelector
        value={{
          budget: String(formData.budget),
          budget_min: String(formData.budget_min || ''),
          budget_max: String(formData.budget_max || ''),
          show_budget_to_contractors: formData.show_budget_to_contractors || false,
          require_itemized_bids: formData.require_itemized_bids || false,
        }}
        onChange={(budgetData: BudgetData) => {
          setFormData(prev => ({
            ...prev,
            budget: budgetData.budget,
            budget_min: budgetData.budget_min,
            budget_max: budgetData.budget_max,
            show_budget_to_contractors: budgetData.show_budget_to_contractors,
            require_itemized_bids: budgetData.require_itemized_bids,
          }));
        }}
        hasImages={hasImages}
      />

      {/* Urgency */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-3">
          When do you need this done?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {URGENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFormData(prev => ({ ...prev, urgency: option.value as 'low' | 'medium' | 'high' }))}
              className={`flex flex-col p-6 rounded-xl border-2 transition-all text-left ${
                formData.urgency === option.value
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-lg font-semibold text-gray-900 mb-1">{option.label}</span>
              <span className="text-sm text-gray-600">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Date */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-3">
          Preferred start date (optional)
        </label>
        <input
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-base"
        />
      </div>
    </div>
  );
}
