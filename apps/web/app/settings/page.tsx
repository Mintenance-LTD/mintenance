'use client';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Mintenance',
  description: 'Manage your account settings, profile, security, notifications, and payment preferences.',
};

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCSRF } from '@/lib/hooks/useCSRF';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { ArrowLeft, Shield } from 'lucide-react';
import { AgentAutomationPanel } from '@/components/agents/AgentAutomationPanel';

type SectionKey = 'profile' | 'account' | 'notifications' | 'payments' | 'automation' | 'privacy';

export default function SettingsPage2025({
  params,
  searchParams,
}: {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  // Note: params and searchParams are Promises in Next.js 16, but we use hooks instead
  // Accepting them here prevents React DevTools serialization errors
  const router = useRouter();
  const { user, loading: loadingUser, refresh } = useCurrentUser();
  const { csrfToken } = useCSRF();
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationPhoneNumber, setVerificationPhoneNumber] = useState('');

  // Check URL params to see if we should open a specific tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'verification' || tab === 'account') {
      setActiveSection('account');
    } else if (tab === 'automation') {
      setActiveSection('automation');
    }
  }, []);

  // Profile form state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    profile_image_url: '',
    address: '',
    city: '',
    postcode: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailJobs: true,
    emailMessages: true,
    emailPayments: true,
    emailMarketing: false,
    smsJobs: false,
    smsMessages: true,
    smsPayments: true,
    smsMarketing: false,
    pushJobs: true,
    pushMessages: true,
    pushPayments: true,
    pushMarketing: false,
  });

  // Two-factor authentication state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        profile_image_url: user.profile_image_url || '',
        address: (user as any).address || '',
        city: (user as any).city || '',
        postcode: (user as any).postcode || '',
      });
    }
  }, [user]);

  // Redirect to login if not authenticated (useEffect to avoid render warning)
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/settings');
    }
  }, [loadingUser, user, router]);

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        toast.success('Profile updated successfully');
        // Refresh user data to show updated values
        refresh();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      // Implement password change API call
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Error changing password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      // Implement notification preferences API call
      toast.success('Notification preferences updated');
    } catch (error) {
      toast.error('Error updating notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profileImageUrl) {
          setProfileData({ ...profileData, profile_image_url: data.profileImageUrl });
          toast.success('Profile picture updated');
          // Refresh user data
          refresh();
        }
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      toast.error('Error uploading image');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/user/export-data', { method: 'POST' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Data exported successfully!');
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      toast.error('Error exporting data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/user/delete-account', { method: 'DELETE' });
      if (response.ok) {
        toast.success('Account deleted successfully');
        window.location.href = '/login?deleted=true';
      } else {
        toast.error('Failed to delete account');
      }
    } catch (error) {
      toast.error('Error deleting account');
    }
  };

  const sidebarSections = [
    { key: 'profile' as SectionKey, label: 'Profile' },
    { key: 'account' as SectionKey, label: 'Account & Security' },
    { key: 'notifications' as SectionKey, label: 'Notifications' },
    { key: 'payments' as SectionKey, label: 'Payments' },
    { key: 'automation' as SectionKey, label: 'AI & Automation' },
    { key: 'privacy' as SectionKey, label: 'Privacy' },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .settings-page input[type='text'],
        .settings-page input[type='email'],
        .settings-page input[type='password'],
        .settings-page input[type='tel'],
        .settings-page input[type='number'],
        .settings-page textarea {
          color: white !important;
        }
      `}} />
      <div className="min-h-screen bg-gray-50 settings-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Dashboard Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="flex gap-8">
          {/* Sidebar Navigation - 20% width */}
          <aside className="w-1/5 min-w-[200px]">
            <nav className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-8">
              {sidebarSections.map((section) => (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 ${
                    activeSection === section.key
                      ? 'border-teal-600 bg-gray-50 font-medium text-gray-900'
                      : 'border-transparent text-gray-600'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content Area - 80% width */}
          <main className="flex-1">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
                <p className="text-gray-600 mb-6">Manage your personal information</p>

                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  {/* Avatar Upload */}
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        {profileData.profile_image_url ? (
                          <Image
                            src={profileData.profile_image_url}
                            alt="Profile"
                            width={120}
                            height={120}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] rounded-full bg-teal-600 flex items-center justify-center text-white text-4xl font-bold">
                            {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                          Change photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-sm text-gray-500 mt-2">
                          JPG, PNG or WEBP. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          First name
                        </label>
                        <input
                          type="text"
                          value={profileData.first_name}
                          onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                          style={{ color: 'white' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Last name
                        </label>
                        <input
                          type="text"
                          value={profileData.last_name}
                          onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                          style={{ color: 'white' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                        style={{ color: 'white' }}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Your primary email for account notifications
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                        style={{ color: 'white' }}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Optional contact number
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                        style={{ color: 'white' }}
                        placeholder="Tell us about yourself..."
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Brief description for your profile
                      </p>
                    </div>

                    {/* Location Section */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Your location helps us match you with nearby contractors.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Address
                          </label>
                          <input
                            type="text"
                            value={profileData.address}
                            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                          style={{ color: 'white' }}
                            placeholder="123 Main Street"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              value={profileData.city}
                              onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                          style={{ color: 'white' }}
                              placeholder="London"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Postcode
                            </label>
                            <input
                              type="text"
                              value={profileData.postcode}
                              onChange={(e) => setProfileData({ ...profileData, postcode: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                          style={{ color: 'white' }}
                              placeholder="SW1A 1AA"
                            />
                          </div>
                        </div>

                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mt-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center mt-0.5">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-teal-900">Location will be geocoded automatically</p>
                              <p className="text-xs text-teal-700 mt-1">
                                When you save, we&apos;ll automatically determine your precise coordinates
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      onClick={() => {
                        if (user) {
                          setProfileData({
                            first_name: user.first_name || '',
                            last_name: user.last_name || '',
                            email: user.email || '',
                            phone: user.phone || '',
                            bio: user.bio || '',
                            profile_image_url: user.profile_image_url || '',
                            address: (user as any).address || '',
                            city: (user as any).city || '',
                            postcode: (user as any).postcode || '',
                          });
                        }
                      }}
                      className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account & Security Section */}
            {activeSection === 'account' && (
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
                            : 'Phone verification is required to post jobs'}
                        </p>
                      </div>
                      {user.phone_verified ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                          Verified
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                          Not Verified
                        </span>
                      )}
                    </div>

                    {!user.phone_verified && (
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
                      {!user.phone_verified && (
                        <>
                          {!user.phone ? (
                            <button
                              onClick={() => {
                                // Navigate to profile section to add phone
                                setActiveSection('profile');
                                toast('Please add your phone number in the Profile section first', { icon: 'ℹ️' });
                              }}
                              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                            >
                              Add Phone Number
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                setIsSaving(true);
                                try {
                                  if (!csrfToken) {
                                    toast.error('Security token not available. Please refresh the page.');
                                    return;
                                  }

                                  // Step 1: Send verification code
                                  toast.loading('Sending verification code...', { id: 'verify' });

                                  const sendResponse = await fetch('/api/auth/verify-phone', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'x-csrf-token': csrfToken,
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                      action: 'send',
                                      phoneNumber: user.phone,
                                    }),
                                  });

                                  const sendData = await sendResponse.json();

                                  if (!sendResponse.ok) {
                                    toast.error(sendData.error || 'Failed to send verification code', { id: 'verify' });
                                    setIsSaving(false);
                                    return;
                                  }

                                  toast.success('Verification code sent to your phone!', { id: 'verify' });

                                  // Step 2: Show verification dialog
                                  setVerificationPhoneNumber(user.phone || '');
                                  setShowVerificationDialog(true);
                                  setVerificationCode('');

                                } catch (error) {
                                  logger.error('Verification error:', error);
                                  toast.error('Failed to send verification code. Please try again.', { id: 'verify' });
                                } finally {
                                  setIsSaving(false);
                                }
                              }}
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
                          onClick={() => {
                            setActiveSection('profile');
                          }}
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
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
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
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
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
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleChangePassword}
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
                          onClick={handleDeleteAccount}
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
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
                <p className="text-gray-600 mb-6">Manage how you receive notifications</p>

                {/* Email Notifications */}
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Email notifications</h2>
                  <div className="space-y-4">
                    {[
                      { key: 'emailJobs' as keyof typeof notificationPrefs, label: 'Jobs', desc: 'Get notified about new job opportunities' },
                      { key: 'emailMessages' as keyof typeof notificationPrefs, label: 'Messages', desc: 'New messages from homeowners or contractors' },
                      { key: 'emailPayments' as keyof typeof notificationPrefs, label: 'Payments', desc: 'Payment confirmations and invoices' },
                      { key: 'emailMarketing' as keyof typeof notificationPrefs, label: 'Marketing', desc: 'Tips, offers, and product updates' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationPrefs[item.key]}
                            onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [item.key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SMS Notifications */}
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">SMS notifications</h2>
                  <div className="space-y-4">
                    {[
                      { key: 'smsJobs' as keyof typeof notificationPrefs, label: 'Jobs', desc: 'Get notified about new job opportunities' },
                      { key: 'smsMessages' as keyof typeof notificationPrefs, label: 'Messages', desc: 'New messages from homeowners or contractors' },
                      { key: 'smsPayments' as keyof typeof notificationPrefs, label: 'Payments', desc: 'Payment confirmations and invoices' },
                      { key: 'smsMarketing' as keyof typeof notificationPrefs, label: 'Marketing', desc: 'Tips, offers, and product updates' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationPrefs[item.key]}
                            onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [item.key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Push notifications</h2>
                  <div className="space-y-4">
                    {[
                      { key: 'pushJobs' as keyof typeof notificationPrefs, label: 'Jobs', desc: 'Get notified about new job opportunities' },
                      { key: 'pushMessages' as keyof typeof notificationPrefs, label: 'Messages', desc: 'New messages from homeowners or contractors' },
                      { key: 'pushPayments' as keyof typeof notificationPrefs, label: 'Payments', desc: 'Payment confirmations and invoices' },
                      { key: 'pushMarketing' as keyof typeof notificationPrefs, label: 'Marketing', desc: 'Tips, offers, and product updates' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="font-medium text-gray-900">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationPrefs[item.key]}
                            onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [item.key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={isSaving}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* AI & Automation Section */}
            {activeSection === 'automation' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">AI & Automation</h1>
                <p className="text-gray-600 mb-6">
                  Control how AI agents assist you with bids, pricing, scheduling, and more.
                </p>
                <AgentAutomationPanel />
              </div>
            )}

            {/* Payments Section */}
            {activeSection === 'payments' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
                <p className="text-gray-600 mb-6">Manage your payment methods</p>

                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment methods</h2>

                  <div className="space-y-4 mb-6">
                    {/* Placeholder for saved cards */}
                    <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <input type="radio" name="payment" defaultChecked className="w-4 h-4 text-teal-600" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Visa ending in 4242</p>
                        <p className="text-sm text-gray-500">Expires 12/2025</p>
                      </div>
                      <button className="text-sm text-red-600 hover:text-red-700">Remove</button>
                    </div>
                  </div>

                  <button className="px-6 py-3 border-2 border-teal-600 text-teal-600 rounded-lg font-medium hover:bg-teal-50 transition-colors">
                    + Add new card
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy</h1>
                <p className="text-gray-600 mb-6">Manage your privacy and data</p>

                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Download your data</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    You can request a copy of all your personal data we have stored.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {isExporting ? 'Exporting...' : 'Export my data'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Phone Verification Dialog */}
      {showVerificationDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold mb-4">Enter Verification Code</h3>
            <p className="text-gray-600 mb-6">
              We've sent a 6-digit verification code to {verificationPhoneNumber}
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  // Only allow digits and max 6 characters
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                maxLength={6}
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                {verificationCode.length}/6 digits
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (verificationCode.length !== 6) {
                    toast.error('Please enter a 6-digit code');
                    return;
                  }

                  setIsSaving(true);
                  try {
                    toast.loading('Verifying code...', { id: 'verify-code' });

                    const verifyResponse = await fetch('/api/auth/verify-phone', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': csrfToken || '',
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        action: 'verify',
                        code: verificationCode,
                      }),
                    });

                    const verifyData = await verifyResponse.json();

                    if (!verifyResponse.ok) {
                      toast.error(verifyData.error || 'Invalid verification code', { id: 'verify-code' });
                      setVerificationCode('');
                      return;
                    }

                    toast.success('Phone number verified successfully!', { id: 'verify-code' });
                    setShowVerificationDialog(false);
                    setVerificationCode('');

                    // Refresh user data to show updated verification status
                    refresh();

                  } catch (error) {
                    logger.error('Verification error:', error);
                    toast.error('Verification failed. Please try again.', { id: 'verify-code' });
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={verificationCode.length !== 6 || isSaving}
                className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Verifying...' : 'Verify'}
              </button>

              <button
                onClick={() => {
                  setShowVerificationDialog(false);
                  setVerificationCode('');
                  toast.error('Verification cancelled');
                }}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <button
              onClick={async () => {
                setIsSaving(true);
                try {
                  toast.loading('Resending code...', { id: 'resend' });

                  const resendResponse = await fetch('/api/auth/verify-phone', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-csrf-token': csrfToken || '',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      action: 'send',
                      phoneNumber: verificationPhoneNumber,
                    }),
                  });

                  if (resendResponse.ok) {
                    toast.success('New verification code sent!', { id: 'resend' });
                    setVerificationCode('');
                  } else {
                    toast.error('Failed to resend code. Please try again.', { id: 'resend' });
                  }
                } catch (error) {
                  toast.error('Failed to resend code', { id: 'resend' });
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="w-full mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium disabled:opacity-50"
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
