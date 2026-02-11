'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import toast from 'react-hot-toast';

interface Preferences {
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
}

interface ProfilePreferencesTabProps {
  preferences: Preferences;
  onPreferencesChange: (preferences: Preferences) => void;
}

export function ProfilePreferencesTab({
  preferences,
  onPreferencesChange,
}: ProfilePreferencesTabProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">App Preferences</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={preferences.language}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPreferencesChange({ ...preferences, language: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="fr">Francais</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select
            value={preferences.timezone}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPreferencesChange({ ...preferences, timezone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="Europe/London">London (GMT)</option>
            <option value="America/New_York">New York (EST)</option>
            <option value="America/Los_Angeles">Los Angeles (PST)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={preferences.currency}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPreferencesChange({ ...preferences, currency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="GBP">GBP (pounds)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (euros)</option>
            <option value="JPY">JPY (yen)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
          <select
            value={preferences.dateFormat}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPreferencesChange({ ...preferences, dateFormat: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <MotionButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            toast.success('Redirecting to settings to save preferences...');
            window.location.href = '/settings?tab=preferences';
          }}
          className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Save Preferences
        </MotionButton>
      </div>
    </MotionDiv>
  );
}
