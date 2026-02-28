/**
 * Building Assessment Display Component
 * Shows AI building assessment results in job details page
 */

'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { formatMoney } from '@/lib/utils/currency';

function getCsrfTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:__Host-csrf-token|csrf-token)=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

interface BuildingAssessmentDisplayProps {
  assessment: Phase1BuildingAssessment | null;
  loading?: boolean;
  onCorrection?: (assessmentId: string, corrections: unknown[]) => void;
  jobId?: string;
  photoUrls?: string[];
}

export function BuildingAssessmentDisplay({
  assessment,
  loading = false,
  onCorrection,
  jobId,
  photoUrls,
}: BuildingAssessmentDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const [showCorrections, setShowCorrections] = useState(false);
  const [reRunLoading, setReRunLoading] = useState(false);
  const [reRunError, setReRunError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    if (!jobId || !photoUrls?.length) return;
    setReRunLoading(true);
    setReRunError(null);
    try {
      const res = await fetch('/api/building-surveyor/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfTokenFromCookie(),
        },
        body: JSON.stringify({ imageUrls: photoUrls.slice(0, 4), jobId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `Analysis failed (${res.status})`);
      }
      window.location.reload();
    } catch (err) {
      setReRunError(err instanceof Error ? err.message : 'Failed to run analysis');
      setReRunLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Guard: also treat incomplete assessments (placeholder row without GPT data) as "no assessment"
  if (!assessment || !assessment.damageAssessment) {
    if (jobId && photoUrls && photoUrls.length > 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Building Assessment</h3>
              <p className="text-sm text-gray-500">
                {assessment ? 'Previous analysis incomplete — run it again' : 'No analysis yet — run it now using your uploaded photos'}
              </p>
            </div>
          </div>
          {reRunError && (
            <p className="text-sm text-red-600 mb-3 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {reRunError}
            </p>
          )}
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={reRunLoading}
            className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {reRunLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing photos…</>
              : <><Sparkles className="w-4 h-4" /> Run AI Analysis</>}
          </button>
        </div>
      );
    }
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'full':
        return 'text-red-600 bg-red-50';
      case 'severe':
      case 'midway':
        return 'text-orange-600 bg-orange-50';
      case 'moderate':
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'minimal':
      case 'early':
      case 'low':
      case 'none':
        return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  // Derive risk level from numeric score
  const getRiskLevelFromScore = (score: number): string => {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  };

  const safetyRiskLevel = getRiskLevelFromScore(100 - (assessment.safetyHazards.overallSafetyScore ?? 80));
  const confidence = assessment.damageAssessment.confidence ?? 0;
  const estimatedCost = assessment.contractorAdvice?.estimatedCost;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Building Assessment</h3>
              <p className="text-sm text-gray-500">
                Advanced analysis by GPT-4 Vision + YOLO + SAM3
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
              {Math.round(confidence)}% Confidence
            </span>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200">
          {/* Damage Assessment */}
          <div className="p-6">
            <h4 className="font-medium text-gray-900 mb-4">Damage Assessment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Damage Type</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {assessment.damageAssessment.damageType.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Severity</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getSeverityColor(assessment.damageAssessment.severity)}`}>
                    {assessment.damageAssessment.severity}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700 text-sm">
                  {assessment.damageAssessment.description}
                </p>
              </div>
            </div>

            {/* Detected Items */}
            {(assessment.damageAssessment.detectedItems?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Detected Issues:</p>
                <div className="flex flex-wrap gap-2">
                  {assessment.damageAssessment.detectedItems!.map((item, index) => (
                    <span key={index} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Homeowner Explanation */}
            {assessment.homeownerExplanation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">What this means for you</p>
                <p className="text-sm text-blue-800">{assessment.homeownerExplanation.whatIsIt}</p>
                {assessment.homeownerExplanation.whatToDo && (
                  <p className="text-sm text-blue-700 mt-1"><strong>Action:</strong> {assessment.homeownerExplanation.whatToDo}</p>
                )}
              </div>
            )}
          </div>

          {/* Safety Hazards */}
          {assessment.safetyHazards.hasCriticalHazards && (
            <div className="p-6 bg-red-50 border-t border-red-100">
              <div className="flex items-start gap-3">
                {getRiskIcon(safetyRiskLevel)}
                <div className="flex-1">
                  <h4 className="font-medium text-red-900 mb-2">Safety Hazards Detected</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Safety Score: <span className="font-semibold">{assessment.safetyHazards.overallSafetyScore}/100</span>
                  </p>
                  {(assessment.safetyHazards.hazards?.length ?? 0) > 0 && (
                    <div className="space-y-1 mb-3">
                      {assessment.safetyHazards.hazards.map((hazard, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span className="text-sm text-red-800">
                            <strong>{hazard.type}</strong>: {hazard.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cost Estimate */}
          <div className="p-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Cost Estimate</h4>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Estimated Cost</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatMoney(estimatedCost?.recommended ?? 0)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Range: {formatMoney(estimatedCost?.min ?? 0)} – {formatMoney(estimatedCost?.max ?? 0)}
              </div>
              {assessment.contractorAdvice?.estimatedTime && (
                <div className="text-xs text-gray-500 mt-1">
                  Estimated time: {assessment.contractorAdvice.estimatedTime}
                </div>
              )}
            </div>

            {/* Materials Breakdown */}
            {(assessment.contractorAdvice?.materials?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Materials:</p>
                <div className="space-y-1">
                  {assessment.contractorAdvice!.materials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {material.name} ({material.quantity})
                      </span>
                      <span className="font-medium">{formatMoney(material.estimatedCost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Insurance Risk */}
          <div className="p-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Insurance Assessment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Risk Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full"
                      style={{ width: `${assessment.insuranceRisk.riskScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{assessment.insuranceRisk.riskScore}/100</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Premium Impact</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getSeverityColor(assessment.insuranceRisk.premiumImpact)}`}>
                  {assessment.insuranceRisk.premiumImpact}
                </span>
              </div>
            </div>
            {(assessment.insuranceRisk.mitigationSuggestions?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-500 mb-1">Recommended Action</p>
                <p className="text-sm text-gray-700">{assessment.insuranceRisk.mitigationSuggestions[0]}</p>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {(assessment.contractorAdvice?.repairNeeded?.length ?? 0) > 0 && (
            <div className="p-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">AI Recommendations</h4>
              <div className="space-y-2">
                {assessment.contractorAdvice!.repairNeeded.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgency */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>
                Urgency: <strong className="capitalize">{assessment.urgency.urgency}</strong>
              </span>
              <span>{assessment.urgency.recommendedActionTimeline}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCorrections(true)}
                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Improve Assessment
              </button>
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={reRunLoading || !jobId || !photoUrls?.length}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 disabled:opacity-40 flex items-center gap-1.5"
              >
                {reRunLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Re-run Analysis
              </button>
            </div>
            {reRunError && (
              <p className="text-xs text-red-500 mt-2 text-right">{reRunError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
