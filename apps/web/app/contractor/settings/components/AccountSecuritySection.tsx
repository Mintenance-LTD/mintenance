'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface AccountSecuritySectionProps {
  email: string;
  emailVerified: boolean;
  passwordData: PasswordData;
  twoFactorEnabled: boolean;
  showDeleteConfirm: boolean;
  isSaving: boolean;
  onPasswordDataChange: (data: PasswordData) => void;
  onTwoFactorChange: (enabled: boolean) => void;
  onChangePassword: () => void;
  onShowDeleteConfirm: (show: boolean) => void;
  onDeleteAccount: () => void;
}

export function AccountSecuritySection({
  email,
  emailVerified,
  passwordData,
  twoFactorEnabled,
  showDeleteConfirm,
  isSaving,
  onPasswordDataChange,
  onTwoFactorChange,
  onChangePassword,
  onShowDeleteConfirm,
  onDeleteAccount,
}: AccountSecuritySectionProps) {
  return (
    <div className="space-y-6">
      {/* Email Verification */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Email Verification</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-900 font-semibold text-lg">{email}</p>
            <p className="text-sm text-gray-500 mt-1">Your primary email address</p>
          </div>
          {emailVerified && (
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2 border border-green-200">
              <CheckCircle className="w-4 h-4" />
              Verified
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Change Password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Current password</label>
            <input type="password" value={passwordData.currentPassword} onChange={(e) => onPasswordDataChange({ ...passwordData, currentPassword: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">New password</label>
            <input type="password" value={passwordData.newPassword} onChange={(e) => onPasswordDataChange({ ...passwordData, newPassword: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm new password</label>
            <input type="password" value={passwordData.confirmPassword} onChange={(e) => onPasswordDataChange({ ...passwordData, confirmPassword: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={onChangePassword} disabled={isSaving} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
              {isSaving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </div>
      </div>

      {/* Two-Factor Auth */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Two-factor authentication</h2>
            <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={twoFactorEnabled} onChange={(e) => onTwoFactorChange(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Danger Zone</h2>
            <p className="text-sm text-red-700">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
        </div>
        {!showDeleteConfirm ? (
          <button onClick={() => onShowDeleteConfirm(true)} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
            Delete account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-900">Are you absolutely sure?</p>
            <div className="flex gap-3">
              <button onClick={onDeleteAccount} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">Yes, delete forever</button>
              <button onClick={() => onShowDeleteConfirm(false)} className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border-2 border-gray-200">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
