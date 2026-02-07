'use client';

import React from 'react';
import { Lock, Shield, Bell, AlertCircle, Trash2 } from 'lucide-react';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  lastPasswordChange: string;
}

interface ProfileSecurityTabProps {
  securitySettings: SecuritySettings;
  onSecurityChange: (settings: SecuritySettings) => void;
  onPasswordChange: () => void;
  onDeleteAccount: () => void;
}

export function ProfileSecurityTab({
  securitySettings,
  onSecurityChange,
  onPasswordChange,
  onDeleteAccount,
}: ProfileSecurityTabProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Password Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Password & Authentication</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-500">
                  Last changed: {new Date(securitySettings.lastPasswordChange).toLocaleDateString()}
                </p>
              </div>
            </div>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPasswordChange}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Change Password
            </MotionButton>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">
                  {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={securitySettings.twoFactorEnabled}
                onChange={(e) =>
                  onSecurityChange({ ...securitySettings, twoFactorEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Login Notifications</p>
                <p className="text-sm text-gray-500">Get notified of new login attempts</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={securitySettings.loginNotifications}
                onChange={(e) =>
                  onSecurityChange({ ...securitySettings, loginNotifications: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
        <h2 className="text-2xl font-bold text-red-900 mb-6">Danger Zone</h2>

        <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Delete Account</h3>
            <p className="text-sm text-red-700 mb-4">
              Once you delete your account, there is no going back. This action cannot be undone.
            </p>
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDeleteAccount}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete My Account
            </MotionButton>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
}
