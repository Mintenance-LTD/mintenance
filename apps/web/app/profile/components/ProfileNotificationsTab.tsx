'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import toast from 'react-hot-toast';

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  jobUpdates: boolean;
  bidAlerts: boolean;
  messageAlerts: boolean;
  marketingEmails: boolean;
}

const NOTIFICATION_DESCRIPTIONS: Record<string, string> = {
  emailNotifications: 'Receive notifications via email',
  smsNotifications: 'Receive notifications via SMS',
  pushNotifications: 'Receive push notifications',
  jobUpdates: 'Get updates about your jobs',
  bidAlerts: 'Get alerts about new bids',
  messageAlerts: 'Get notified of new messages',
  marketingEmails: 'Receive promotional emails',
};

interface ProfileNotificationsTabProps {
  notificationSettings: NotificationSettings;
  onNotificationChange: (settings: NotificationSettings) => void;
}

export function ProfileNotificationsTab({
  notificationSettings,
  onNotificationChange,
}: ProfileNotificationsTabProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

      <div className="space-y-4">
        {Object.entries(notificationSettings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              </p>
              <p className="text-sm text-gray-500">
                {NOTIFICATION_DESCRIPTIONS[key] || ''}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onNotificationChange({ ...notificationSettings, [key]: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <MotionButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            toast.success('Redirecting to settings to save preferences...');
            window.location.href = '/settings?tab=notifications';
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
