'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp, Gauge, TrendingUp, AlertCircle } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { AssessmentResult } from './TryMintAIClient';

interface AssessmentResultsProps {
  result: AssessmentResult;
  onAccuracyFeedback: (isAccurate: boolean) => void;
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function AssessmentResults({ result, onAccuracyFeedback }: AssessmentResultsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minor':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'Moderate':
        return 'text-amber-700 bg-amber-100 border-amber-300';
      case 'Severe':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Minor':
        return <CheckCircle2 className="w-5 h-5" aria-hidden="true" />;
      case 'Moderate':
        return <AlertCircle className="w-5 h-5" aria-hidden="true" />;
      case 'Severe':
        return <AlertTriangle className="w-5 h-5" aria-hidden="true" />;
      default:
        return <AlertCircle className="w-5 h-5" aria-hidden="true" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleFeedback = (isAccurate: boolean) => {
    setFeedbackGiven(true);
    onAccuracyFeedback(isAccurate);
  };

  return (
    <section aria-labelledby="results-heading" className="mb-16">
      <MotionDiv
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5 }}
      >
        {/* Main results card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-transparent bg-gradient-to-br from-teal-50 to-emerald-50">
          {/* Gradient border effect */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 h-2" />

          <div className="p-8 sm:p-12">
            <h2 id="results-heading" className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Assessment Results
            </h2>

            <div className="space-y-6">
              {/* Damage type badge */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Damage Type
                </label>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-lg font-semibold">
                  {result.damageType}
                </div>
              </div>

              {/* Severity indicator */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Severity Level
                </label>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border-2 ${getSeverityColor(result.severity)}`}>
                  {getSeverityIcon(result.severity)}
                  {result.severity}
                </div>
              </div>

              {/* Cost estimate */}
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-6 h-6 text-teal-600" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Estimated Repair Cost
                  </h3>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(result.costEstimate.min)}
                  </span>
                  <span className="text-2xl text-gray-500">-</span>
                  <span className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                    {formatCurrency(result.costEstimate.max)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Based on typical UK property repair costs
                </p>
              </div>

              {/* Confidence score */}
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-gray-600" aria-hidden="true" />
                    <span className="text-sm font-medium text-gray-600">
                      AI Confidence
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {result.confidence}%
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-500"
                    style={{ width: `${result.confidence}%` }}
                    role="progressbar"
                    aria-valuenow={result.confidence}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Confidence level: ${result.confidence} percent`}
                  />
                </div>
              </div>

              {/* Expandable details */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center justify-between w-full text-left focus:outline-none focus:ring-2 focus:ring-teal-500 rounded p-2"
                  aria-expanded={isExpanded}
                  aria-controls="assessment-details"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    Detailed Breakdown
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-6 h-6 text-gray-600" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-600" aria-hidden="true" />
                  )}
                </button>

                {isExpanded && (
                  <div id="assessment-details" className="mt-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-700">{result.details.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Urgency</h4>
                        <p className="text-gray-700 capitalize">{result.details.urgency}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Safety Risk</h4>
                        <p className="text-gray-700">{result.details.safetyRisk}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {result.details.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Materials Section */}
                    {result.details.materials && result.details.materials.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Materials Needed
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {result.details.materials.map((material, idx) => (
                            <div
                              key={idx}
                              className="relative p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-teal-300 transition-colors"
                            >
                              {/* Database Badge */}
                              {material.source === 'database' && (
                                <div className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold bg-teal-100 text-teal-800 rounded">
                                  ✓ DB
                                </div>
                              )}

                              {/* Material Name */}
                              <div className="font-medium text-gray-900 pr-12 mb-1">
                                {material.name}
                              </div>

                              {/* Quantity */}
                              <div className="text-sm text-gray-600 mb-2">
                                {material.quantity}
                              </div>

                              {/* Price Information */}
                              {material.source === 'database' && material.unit_price ? (
                                <div className="space-y-1">
                                  <div className="text-sm text-gray-700">
                                    £{material.unit_price.toFixed(2)}/{material.unit}
                                  </div>
                                  {material.total_cost && (
                                    <div className="text-sm font-semibold text-emerald-600">
                                      Total: £{material.total_cost.toFixed(2)}
                                    </div>
                                  )}
                                  {material.supplier_name && (
                                    <div className="text-xs text-gray-500">
                                      {material.supplier_name}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-600">
                                  Est. cost: £{material.estimatedCost.toFixed(2)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Total Material Cost */}
                        {result.details.materials.some(m => m.total_cost) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-900">Estimated Material Cost:</span>
                              <span className="text-lg font-bold text-teal-600">
                                £{result.details.materials
                                  .filter(m => m.total_cost)
                                  .reduce((sum, m) => sum + (m.total_cost || 0), 0)
                                  .toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Based on current UK supplier prices
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Accuracy feedback */}
            {!feedbackGiven && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-center text-gray-900 font-medium mb-4">
                  Was this assessment accurate?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleFeedback(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    Yes, accurate
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    <XCircle className="w-5 h-5" aria-hidden="true" />
                    No, needs correction
                  </button>
                </div>
              </div>
            )}

            {feedbackGiven && (
              <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                <p className="text-green-700 font-medium">
                  Thank you for your feedback!
                </p>
              </div>
            )}
          </div>
        </div>
      </MotionDiv>
    </section>
  );
}
