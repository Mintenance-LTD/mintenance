'use client';

import { Brain, Building2, MapPinned, RefreshCw } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { SmartJobAnalysis } from '@/app/jobs/create/components/SmartJobAnalysis';
import { formatMoney } from '@/lib/utils/currency';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface BuildingSurvey {
  damageAssessment?: {
    damageType?: string;
    severity?: 'early' | 'midway' | 'full';
    costEstimate?: {
      min: number;
      max: number;
    };
  };
  safetyHazards?: Array<{
    description: string;
  }>;
  decisionResult?: {
    fusionMean?: number;
  };
}

interface GeocodeData {
  latitude: number;
  longitude: number;
  formatted_address?: string;
}

interface AIAnalysisSectionProps {
  formTitle: string;
  formDescription: string;
  formLocationString: string;
  formImages: string[];
  analyzeWithAI: boolean;
  runBuildingSurvey: boolean;
  showAIInsights: boolean;
  aiAnalysis: unknown;
  buildingSurvey: BuildingSurvey | null;
  geocodeData: GeocodeData | null;
  isSubmitting: boolean;
  hasImages: boolean;
  onAnalyzeWithAIChange: (checked: boolean) => void;
  onRunBuildingSurveyChange: (checked: boolean) => void;
  onRunAIAnalysis: () => void;
  onCategorySelect: (cat: string) => void;
  onBudgetSelect: (budget: number) => void;
  onUrgencySelect: (urgency: string) => void;
}

export function AIAnalysisSection({
  formTitle,
  formDescription,
  formLocationString,
  formImages,
  analyzeWithAI,
  runBuildingSurvey,
  showAIInsights,
  aiAnalysis,
  buildingSurvey,
  geocodeData,
  isSubmitting,
  hasImages,
  onAnalyzeWithAIChange,
  onRunBuildingSurveyChange,
  onRunAIAnalysis,
  onCategorySelect,
  onBudgetSelect,
  onUrgencySelect,
}: AIAnalysisSectionProps) {
  return (
    <MotionDiv
      variants={fadeIn}
      className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl shadow-lg border border-teal-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-600" />
            AI Assistant
          </h2>
          <p className="text-xs text-teal-600 mt-0.5">Powered by Mint AI</p>
        </div>
        <button
          type="button"
          onClick={onRunAIAnalysis}
          disabled={isSubmitting}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Run AI Analysis
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={analyzeWithAI}
              onChange={(e) => onAnalyzeWithAIChange(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">Enable AI analysis on save</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={runBuildingSurvey}
              onChange={(e) => onRunBuildingSurveyChange(e.target.checked)}
              disabled={!hasImages}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">Run building damage survey</span>
          </label>
        </div>

        {/* Smart Job Analysis Integration */}
        {showAIInsights && aiAnalysis ? (
          <div className="space-y-4">
            <SmartJobAnalysis
              title={formTitle}
              description={formDescription}
              location={formLocationString}
              imageUrls={formImages}
              onCategorySelect={onCategorySelect}
              onBudgetSelect={onBudgetSelect}
              onUrgencySelect={onUrgencySelect}
            />
          </div>
        ) : null}

        {/* Building Survey Results */}
        {buildingSurvey && (
          <div className="bg-white rounded-lg p-4 border border-teal-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Building Survey Results
            </h3>

            {buildingSurvey.damageAssessment && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Damage Detected:</p>
                  <p className="text-sm text-gray-600">
                    {buildingSurvey.damageAssessment.damageType || 'No significant damage detected'}
                  </p>
                </div>

                {buildingSurvey.damageAssessment.severity && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Severity:</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      buildingSurvey.damageAssessment.severity === 'full'
                        ? 'bg-red-100 text-red-800'
                        : buildingSurvey.damageAssessment.severity === 'midway'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {buildingSurvey.damageAssessment.severity}
                    </span>
                  </div>
                )}

                {buildingSurvey.damageAssessment.costEstimate && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Estimated Repair Cost:</p>
                    <p className="text-sm text-gray-600">
                      {formatMoney(buildingSurvey.damageAssessment.costEstimate.min)} - {formatMoney(buildingSurvey.damageAssessment.costEstimate.max)}
                    </p>
                  </div>
                )}

                {buildingSurvey.safetyHazards && buildingSurvey.safetyHazards.length > 0 ? (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 mb-2">Safety Hazards:</p>
                    <ul className="list-disc list-inside text-sm text-red-700">
                      {buildingSurvey.safetyHazards.map((hazard, index: number) => (
                        <li key={index}>{hazard.description}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {buildingSurvey.decisionResult && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Confidence:</span> {Math.round((buildingSurvey.decisionResult.fusionMean || 0) * 100)}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Geocoding Results */}
        {geocodeData && (
          <div className="bg-white rounded-lg p-4 border border-teal-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPinned className="w-4 h-4 text-teal-600" />
              Location Verified
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Latitude: {geocodeData.latitude.toFixed(6)}</p>
                <p className="text-sm text-gray-600">Longitude: {geocodeData.longitude.toFixed(6)}</p>
              </div>
              {geocodeData.formatted_address && (
                <div>
                  <p className="text-sm text-gray-600">{geocodeData.formatted_address}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MotionDiv>
  );
}
