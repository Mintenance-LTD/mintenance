'use client';
import { Bookmark, TrendingUp, MapPin, Brain, Building2 } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';

interface AIAnalysis {
  suggestedPrice?: {
    min: number;
    max: number;
  };
  estimatedDuration?: string;
}

interface BuildingSurvey {
  status?: string;
  defectsFound?: number;
  estimatedCost?: number;
}

interface GeocodeData {
  verified?: boolean;
  formattedAddress?: string;
}

interface JobMetadataProps {
  savedByContractors: number;
  isJobSaved: boolean;
  savingJob: boolean;
  userRole: string;
  aiAnalysis: AIAnalysis | null;
  buildingSurvey: BuildingSurvey | null;
  geocodeData: GeocodeData | null;
  onSaveJob: () => Promise<void>;
}
export function JobMetadata({
  savedByContractors,
  isJobSaved,
  savingJob,
  userRole,
  aiAnalysis,
  buildingSurvey,
  geocodeData,
  onSaveJob,
}: JobMetadataProps) {
  if (userRole !== 'contractor' && savedByContractors === 0) {
    return null;
  }
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Contractor Interest */}
        {savedByContractors > 0 && (
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Contractor Interest</p>
              <p className="font-semibold text-gray-900">
                {savedByContractors} contractor{savedByContractors !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
        )}
        {/* Save Job Button (for contractors) */}
        {userRole === 'contractor' && (
          <button
            type="button"
            onClick={onSaveJob}
            disabled={savingJob}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium
                     transition-colors ${
                       isJobSaved
                         ? 'bg-green-100 text-green-700 hover:bg-green-200'
                         : 'bg-white text-gray-700 hover:bg-gray-50'
                     } ${savingJob ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Bookmark
              className={`h-5 w-5 ${isJobSaved ? 'fill-current' : ''}`}
            />
            <span>{isJobSaved ? 'Saved' : 'Save Job'}</span>
          </button>
        )}
      </div>
      {/* AI Insights Summary */}
      {aiAnalysis && (
        <div className="mt-4 pt-4 border-t border-blue-100">
          <div className="flex items-start space-x-3">
            <Brain className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-gray-700">AI Analysis</p>
              {aiAnalysis.suggestedPrice && (
                <p className="text-sm text-gray-600">
                  Suggested budget: {formatMoney(aiAnalysis.suggestedPrice.min)} - {formatMoney(aiAnalysis.suggestedPrice.max)}
                </p>
              )}
              {aiAnalysis.estimatedDuration && (
                <p className="text-sm text-gray-600">
                  Estimated duration: {aiAnalysis.estimatedDuration}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Building Survey Summary */}
      {buildingSurvey && buildingSurvey.status === 'completed' && (
        <div className="mt-4 pt-4 border-t border-blue-100">
          <div className="flex items-start space-x-3">
            <Building2 className="h-5 w-5 text-indigo-600 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-gray-700">Building Survey</p>
              {buildingSurvey.defectsFound !== undefined && buildingSurvey.defectsFound > 0 && (
                <p className="text-sm text-amber-600">
                  {buildingSurvey.defectsFound} potential issue{buildingSurvey.defectsFound !== 1 ? 's' : ''} detected
                </p>
              )}
              {buildingSurvey.estimatedCost && (
                <p className="text-sm text-gray-600">
                  Repair estimate: {formatMoney(buildingSurvey.estimatedCost)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Location Verification */}
      {geocodeData && geocodeData.verified && (
        <div className="mt-4 pt-4 border-t border-blue-100">
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Location Verified</p>
              <p className="text-sm text-gray-600">
                {geocodeData.formattedAddress}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}