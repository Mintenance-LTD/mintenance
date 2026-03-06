import type { Dispatch, SetStateAction } from 'react';
import { Shield } from 'lucide-react';
import type { PasswordData } from './types';

interface AccountSecurityUser {
  email: string;
  phone?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
}

interface AccountSecuritySectionProps {
  user: AccountSecurityUser;
  passwordData: PasswordData;
  setPasswordData: Dispatch<SetStateAction<PasswordData>>;
  twoFactorEnabled: boolean;
  setTwoFactorEnabled: (enabled: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  isSaving: boolean;
  csrfToken: string | null;
  onChangePassword: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onSendVerificationCode: () => Promise<void>;
  onAddPhoneNumber: () => void;
  onUpdatePhoneNumber: () => void;
}

export function AccountSecuritySection({
  user,
  passwordData,
  setPasswordData,
  twoFactorEnabled,
  setTwoFactorEnabled,
  showDeleteConfirm,
  setShowDeleteConfirm,
  isSaving,
  csrfToken,
  onChangePassword,
  onDeleteAccount,
  onSendVerificationCode,
  onAddPhoneNumber,
  onUpdatePhoneNumber,
}: AccountSecuritySectionProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Account & Security</h1>
      <p className="text-gray-600 mb-6">Manage your account security settings</p>

      {/* Email Verification Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Email</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-900 font-medium">{user.email}</p>
            <p className="text-sm text-gray-500 mt-1">Your primary email address</p>
          </div>
          {user.email_verified && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Phone Verification Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Phone Verification</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-medium">
                {user.phone || 'No phone number added'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {user.phone_verified
                  ? 'Your phone number is verified'
                  : process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION === 'true'
                    ? 'Phone verification is currently not required'
                    : 'Phone verification is required to post jobs'}
              </p>
            </div>
            {user.phone_verified ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                Verified
              </span>
            ) : process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION === 'true' ? (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                Skipped
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                Not Verified
              </span>
            )}
          </div>

          {!user.phone_verified && process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION !== 'true' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Verification Required</p>
                  <p className="text-sm text-amber-700 mt-1">
                    To post jobs and hire contractors, you need to verify your phone number for security purposes.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!user.phone_verified && process.env.NEXT_PUBLIC_SKIP_PHONE_VERIFICATION !== 'true' && (
              <>
                {!user.phone ? (
                  <button
                    onClick={onAddPhoneNumber}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                  >
                    Add Phone Number
                  </button>
                ) : (
                  <button
                    onClick={onSendVerificationCode}
                    disabled={isSaving || !csrfToken}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Sending Code...' : 'Verify Phone Number'}
                  </button>
                )}
              </>
            )}
            {user.phone_verified && user.phone && (
              <button
                onClick={onUpdatePhoneNumber}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Update Phone Number
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Change password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Current password
            </label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              New password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Confirm new password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={onChangePassword}
              disabled={isSaving}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Update password'}
            </button>
            <button
              onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Two-factor authentication</h2>
            <p className="text-sm text-gray-500">
              Add an extra layer of security to your account
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-white rounded-xl border border-red-200 p-8">
        <h2 className="text-xl font-semibold text-red-900 mb-2">Danger zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Delete account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-900">Are you absolutely sure?</p>
            <div className="flex gap-3">
              <button
                onClick={onDeleteAccount}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Yes, delete forever
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
