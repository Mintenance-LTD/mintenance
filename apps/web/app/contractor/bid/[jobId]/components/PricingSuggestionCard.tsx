'use client';

import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn } from '@/lib/animations/variants';

interface PricingSuggestion {
  priceRange: {
    min: number;
    recommended: number;
    max: number;
  };
  marketData: {
    averageBid: number;
    medianBid: number;
    rangeMin: number;
    rangeMax: number;
  };
  winProbability: number;
  competitivenessLevel: 'too_low' | 'competitive' | 'premium' | 'too_high';
  competitivenessScore: number;
  confidenceScore: number;
  reasoning: string;
  factors?: {
    complexityFactor?: number;
    locationFactor?: number;
    contractorTierFactor?: number;
    marketDemandFactor?: number;
    sampleSize?: number;
  };
}

interface PricingSuggestionCardProps {
  suggestion: PricingSuggestion;
  onApplyPrice: (price: number) => void;
  onDismiss: () => void;
}

export function PricingSuggestionCard({
  suggestion,
  onApplyPrice,
  onDismiss,
}: PricingSuggestionCardProps) {
  const { priceRange, marketData, winProbability, competitivenessLevel, confidenceScore, reasoning, factors } = suggestion;

  // Determine color scheme based on competitiveness
  const getCompetitivenessColor = () => {
    switch (competitivenessLevel) {
      case 'too_low':
        return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', badge: 'bg-amber-200 text-amber-800' };
      case 'competitive':
        return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', badge: 'bg-emerald-200 text-emerald-800' };
      case 'premium':
        return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', badge: 'bg-blue-200 text-blue-800' };
      case 'too_high':
        return { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900', badge: 'bg-rose-200 text-rose-800' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', badge: 'bg-gray-200 text-gray-800' };
    }
  };

  const colors = getCompetitivenessColor();

  const getCompetitivenessLabel = () => {
    switch (competitivenessLevel) {
      case 'too_low':
        return 'Below Market';
      case 'competitive':
        return 'Competitive';
      case 'premium':
        return 'Premium Pricing';
      case 'too_high':
        return 'Above Market';
      default:
        return 'Market Rate';
    }
  };

  return (
    <MotionDiv
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-6 shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Pricing Suggestion</h3>
            <p className="text-sm text-gray-600">Powered by market data and ML analysis</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss pricing suggestion"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Price Range - Highlighted Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Suggested Price Range</h4>
        <div className="grid grid-cols-3 gap-4">
          {/* Minimum */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-1">Minimum</p>
            <p className="text-2xl font-bold text-gray-900">£{priceRange.min.toFixed(2)}</p>
          </div>

          {/* Recommended - Emphasized */}
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-4 text-center shadow-md transform scale-105">
            <p className="text-xs text-teal-50 mb-1">Recommended</p>
            <p className="text-3xl font-bold text-white">£{priceRange.recommended.toFixed(2)}</p>
            <div className="mt-2">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                {winProbability}% Win Rate
              </span>
            </div>
          </div>

          {/* Maximum */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-1">Maximum</p>
            <p className="text-2xl font-bold text-gray-900">£{priceRange.max.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Market Insights */}
      <div className="mb-6 bg-white rounded-xl p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Market Insights
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Average Bid</p>
            <p className="text-lg font-semibold text-gray-900">£{marketData.averageBid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Median Bid</p>
            <p className="text-lg font-semibold text-gray-900">£{marketData.medianBid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Market Range</p>
            <p className="text-sm font-medium text-gray-900">
              £{marketData.rangeMin.toFixed(2)} - £{marketData.rangeMax.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Competitiveness</p>
            <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${colors.badge}`}>
              {getCompetitivenessLabel()}
            </span>
          </div>
        </div>

        {factors?.sampleSize && (
          <p className="text-xs text-gray-500 mt-3">
            Based on {factors.sampleSize} similar accepted bids
          </p>
        )}
      </div>

      {/* AI Reasoning */}
      <div className="mb-6 bg-white rounded-xl p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AI Analysis
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">{reasoning}</p>

        {/* Confidence Score */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-600">Confidence:</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all"
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-900">{confidenceScore}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onApplyPrice(priceRange.recommended)}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Use £{priceRange.recommended.toFixed(2)}
        </button>
        <button
          onClick={onDismiss}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
        >
          Dismiss
        </button>
      </div>

      {/* Additional Factors (if available) */}
      {factors && (factors.complexityFactor || factors.locationFactor || factors.contractorTierFactor) && (
        <details className="mt-4 text-xs text-gray-600">
          <summary className="cursor-pointer hover:text-gray-900 font-medium">View adjustment factors</summary>
          <div className="mt-2 space-y-1 pl-4">
            {factors.complexityFactor !== undefined && (
              <p>• Complexity factor: {(factors.complexityFactor * 100).toFixed(0)}%</p>
            )}
            {factors.locationFactor !== undefined && (
              <p>• Location factor: {(factors.locationFactor * 100).toFixed(0)}%</p>
            )}
            {factors.contractorTierFactor !== undefined && (
              <p>• Contractor tier factor: {(factors.contractorTierFactor * 100).toFixed(0)}%</p>
            )}
            {factors.marketDemandFactor !== undefined && (
              <p>• Market demand factor: {(factors.marketDemandFactor * 100).toFixed(0)}%</p>
            )}
          </div>
        </details>
      )}
    </MotionDiv>
  );
}
