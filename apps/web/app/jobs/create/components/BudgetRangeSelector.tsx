'use client';

import React, { useState } from 'react';
import { Info, Eye, EyeOff, TrendingUp, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export interface BudgetData {
  budget: string;           // Exact budget (for validation)
  budget_min?: string;      // Minimum shown to contractors
  budget_max?: string;      // Maximum shown to contractors
  show_budget_to_contractors: boolean;  // Show exact vs range
  require_itemized_bids: boolean;       // Require cost breakdown
}

interface BudgetRangeSelectorProps {
  value: BudgetData;
  onChange: (data: BudgetData) => void;
  hasImages: boolean;
}

export function BudgetRangeSelector({ value, onChange, hasImages }: BudgetRangeSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleBudgetChange = (newBudget: string) => {
    const budgetNum = parseFloat(newBudget) || 0;

    // Auto-calculate min/max as 90-110% of budget
    const min = Math.round(budgetNum * 0.90);
    const max = Math.round(budgetNum * 1.10);

    onChange({
      ...value,
      budget: newBudget,
      budget_min: min > 0 ? min.toString() : '',
      budget_max: max > 0 ? max.toString() : '',
    });
  };

  const handleMinMaxChange = (min: string, max: string) => {
    onChange({
      ...value,
      budget_min: min,
      budget_max: max,
    });
  };

  const toggleBudgetVisibility = () => {
    const newValue = !value.show_budget_to_contractors;
    onChange({
      ...value,
      show_budget_to_contractors: newValue,
    });

    if (!newValue) {
      toast.success('Budget hidden from contractors - they will bid based on fair market value', {
        icon: '🔒',
        duration: 4000,
      });
    } else {
      toast('Budget will be shown to contractors', {
        icon: '👁️',
        duration: 3000,
      });
    }
  };

  const toggleItemizationRequirement = () => {
    onChange({
      ...value,
      require_itemized_bids: !value.require_itemized_bids,
    });
  };

  const budgetNum = parseFloat(value.budget) || 0;
  const requirePhotos = budgetNum > 500;
  const shouldRequireItemization = budgetNum > 500;

  return (
    <div className="space-y-6">
      {/* Main Budget Input */}
      <div>
        <label className="block text-base font-medium text-gray-900 mb-3 flex items-center gap-2">
          What's your maximum budget?
          <div className="relative group">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 top-6 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              This is the <strong>maximum</strong> you're willing to pay. Contractors won't see this exact amount - they'll bid based on the actual work required.
            </div>
          </div>
        </label>

        <div className="space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-semibold">£</span>
            <input
              type="number"
              placeholder="Enter maximum budget"
              value={value.budget}
              onChange={(e) => handleBudgetChange(e.target.value)}
              min="50"
              max="50000"
              step="50"
              className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-lg font-medium"
            />
          </div>

          {budgetNum > 0 && (
            <div className="text-center p-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200">
              <p className="text-4xl font-bold text-teal-600">£{budgetNum.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">Maximum budget</p>

              {value.budget_min && value.budget_max && !value.show_budget_to_contractors && (
                <div className="mt-3 pt-3 border-t border-teal-200">
                  <p className="text-xs text-gray-500 mb-1">Contractors will see a range:</p>
                  <p className="text-lg font-semibold text-teal-700">
                    £{parseFloat(value.budget_min).toLocaleString()} - £{parseFloat(value.budget_max).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Budget Visibility Control */}
      {budgetNum >= 50 && (
        <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {value.show_budget_to_contractors ? (
                <Eye className="w-5 h-5 text-blue-600" />
              ) : (
                <EyeOff className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">
                Budget Visibility
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!value.show_budget_to_contractors}
                    onChange={toggleBudgetVisibility}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Hide exact budget from contractors (Recommended)
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {!value.show_budget_to_contractors ? (
                        <>
                          ✅ Contractors will see a <strong>budget range</strong> (£{value.budget_min}-£{value.budget_max}) instead of your exact maximum.
                          This encourages competitive pricing and prevents contractors from anchoring to your budget.
                        </>
                      ) : (
                        <>
                          Contractors will see your exact budget of <strong>£{budgetNum.toLocaleString()}</strong>.
                          This may result in bids clustering near your maximum.
                        </>
                      )}
                    </p>
                  </div>
                </label>

                {!value.show_budget_to_contractors && (
                  <div className="ml-8 p-3 bg-white rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold">Expected savings: 15-25%</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Jobs with hidden budgets receive bids that are 15-25% lower on average,
                      as contractors bid based on fair market value rather than your budget ceiling.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Itemization Requirement */}
      {budgetNum >= 50 && (
        <div className={`p-5 border-2 rounded-xl ${
          shouldRequireItemization
            ? 'bg-purple-50 border-purple-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {value.require_itemized_bids ? (
                <AlertCircle className="w-5 h-5 text-purple-600" />
              ) : (
                <Info className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">
                Require Detailed Cost Breakdown
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.require_itemized_bids}
                    onChange={toggleItemizationRequirement}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Contractors must itemize their bids
                      {shouldRequireItemization && <span className="ml-2 text-purple-600">(Recommended for £500+)</span>}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {value.require_itemized_bids ? (
                        <>
                          ✅ Contractors must provide a detailed breakdown: <strong>materials</strong>, <strong>labor</strong>, and <strong>other costs</strong>.
                          This makes bids easy to compare and ensures transparency.
                        </>
                      ) : (
                        <>
                          Contractors can submit simple bids without itemization.
                          This is fine for small jobs but recommended for budgets over £500.
                        </>
                      )}
                    </p>
                  </div>
                </label>

                {value.require_itemized_bids && (
                  <div className="ml-8 p-3 bg-white rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-600 mb-2">
                      <strong>Required breakdown:</strong>
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• <strong>Materials:</strong> Itemized list with quantities and prices</li>
                      <li>• <strong>Labor:</strong> Hours and hourly rates</li>
                      <li>• <strong>Other Costs:</strong> Equipment rental, travel, permits, etc.</li>
                      <li>• <strong>VAT:</strong> Clearly separated (20% where applicable)</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Requirement Warning */}
      {requirePhotos && !hasImages && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Photos Required</h4>
              <p className="text-sm text-yellow-800">
                For jobs over £500, you must upload at least one photo to help contractors
                provide accurate quotes. Please go back to Step 2 to add photos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Options Toggle */}
      {budgetNum >= 50 && (
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-teal-600 font-medium hover:text-teal-700 flex items-center gap-2"
          >
            {showAdvanced ? '▼' : '▶'} Advanced Budget Options
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Budget Range (shown to contractors)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Minimum</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
                      <input
                        type="number"
                        value={value.budget_min || ''}
                        onChange={(e) => handleMinMaxChange(e.target.value, value.budget_max || '')}
                        placeholder="Min"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Maximum</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">£</span>
                      <input
                        type="number"
                        value={value.budget_max || ''}
                        onChange={(e) => handleMinMaxChange(value.budget_min || '', e.target.value)}
                        placeholder="Max"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Contractors will see: "Budget Range: £{value.budget_min || '0'} - £{value.budget_max || '0'}"
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Helpful Tips */}
      {budgetNum >= 50 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            Budget Tips
          </h4>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Typical budgets for {getBudgetGuidance(budgetNum)}</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Setting a range instead of exact amount often gets you better prices</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Requiring itemization helps you compare bids fairly</span>
            </li>
            {!value.show_budget_to_contractors && (
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">•</span>
                <span className="text-green-700">
                  <strong>Great choice!</strong> Hidden budgets save homeowners 15-25% on average
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper function to provide budget guidance based on amount
function getBudgetGuidance(budget: number): string {
  if (budget < 200) return 'small repairs: £100-£300';
  if (budget < 500) return 'minor jobs: £200-£600';
  if (budget < 1000) return 'standard jobs: £500-£1,200';
  if (budget < 3000) return 'larger projects: £1,000-£3,500';
  if (budget < 10000) return 'major renovations: £3,000-£12,000';
  return 'significant projects: £10,000+';
}
