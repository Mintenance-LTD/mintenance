'use client';

import { Shield, ExternalLink } from 'lucide-react';

interface DBSCheck {
  status: string;
  dbsType?: string;
  certificateNumber?: string;
  expiryDate?: string;
  boostPercentage?: number;
}

interface DBSCheckSectionProps {
  loadingDBS: boolean;
  dbsCheckStatus: { hasCheck: boolean; check?: DBSCheck } | null;
  initiatingDBS: boolean;
  onInitiateDBS: (type: 'basic' | 'standard' | 'enhanced') => void;
}

export function DBSCheckSection({ loadingDBS, dbsCheckStatus, initiatingDBS, onInitiateDBS }: DBSCheckSectionProps) {
  return (
    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">DBS Check (Disclosure and Barring Service)</h3>
              <p className="text-sm text-gray-600">UK background check for contractors</p>
            </div>
          </div>
          {loadingDBS ? (
            <p className="text-sm text-gray-600 mt-2">Loading DBS check status...</p>
          ) : dbsCheckStatus?.hasCheck && dbsCheckStatus.check ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  dbsCheckStatus.check.status === 'clear' ? 'bg-green-100 text-green-800' :
                  dbsCheckStatus.check.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  dbsCheckStatus.check.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {dbsCheckStatus.check.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              {dbsCheckStatus.check.dbsType && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Type:</span> {dbsCheckStatus.check.dbsType.charAt(0).toUpperCase() + dbsCheckStatus.check.dbsType.slice(1)} DBS Check
                </div>
              )}
              {dbsCheckStatus.check.certificateNumber && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Certificate Number:</span> {dbsCheckStatus.check.certificateNumber}
                </div>
              )}
              {dbsCheckStatus.check.expiryDate && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Expires:</span> {new Date(dbsCheckStatus.check.expiryDate).toLocaleDateString('en-GB')}
                </div>
              )}
              {dbsCheckStatus.check.boostPercentage && (
                <div className="text-sm text-emerald-600 font-medium">
                  Profile Boost: +{dbsCheckStatus.check.boostPercentage}%
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-3">
                A DBS check helps build trust with homeowners and can boost your profile visibility.
              </p>
              <button
                onClick={() => onInitiateDBS('basic')}
                disabled={initiatingDBS}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {initiatingDBS ? 'Initiating...' : 'Start Basic DBS Check (£23)'}
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
