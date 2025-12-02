'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';;
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { fadeIn, scaleIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/MotionDiv';

type TabKey = 'profile' | 'security' | 'privacy' | 'payment';

export default function SettingsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/settings');
    return null;
  }

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

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

  const tabs = [
    { key: 'profile' as TabKey, label: 'Profile', icon: '👤' },
    { key: 'security' as TabKey, label: 'Security', icon: '🔒' },
    { key: 'privacy' as TabKey, label: 'Privacy & GDPR', icon: '🛡️' },
    { key: 'payment' as TabKey, label: 'Payment Methods', icon: '💳' },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/30 to-gray-50">
      <UnifiedSidebar
        userRole={user.role as any}
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: user.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-1">Settings</h1>
                <p className="text-teal-100 text-lg">Manage your account and preferences</p>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-8 w-full">
          {/* Tabs */}
          <MotionDiv
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <div className="flex items-center gap-3 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </MotionDiv>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <MotionDiv
                key="profile"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Profile Info Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                      {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Information</h2>
                      <p className="text-gray-600">Your account details and personal information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">First Name</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 font-medium">
                        {user.first_name || 'Not set'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Last Name</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 font-medium">
                        {user.last_name || 'Not set'}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-2">Email Address</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 font-medium flex items-center justify-between">
                        <span>{user.email}</span>
                        {user.email_verified && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Account Type</label>
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 font-medium capitalize">
                        {user.role}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <Link href="/profile">
                      <button className="w-full md:w-auto px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm transition-all">
                        Edit Profile
                      </button>
                    </Link>
                  </div>
                </div>
              </MotionDiv>
            )}

            {activeTab === 'security' && (
              <MotionDiv
                key="security"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">Security Settings</h2>
                      <p className="text-gray-600">Protect your account</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-teal-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="font-medium text-teal-900 mb-1">Password Management</p>
                          <p className="text-sm text-teal-700">Contact support to change your password or update security settings</p>
                        </div>
                      </div>
                    </div>

                    <Link href="/help">
                      <button className="w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Contact Support
                      </button>
                    </Link>
                  </div>
                </div>
              </MotionDiv>
            )}

            {activeTab === 'privacy' && (
              <MotionDiv
                key="privacy"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* GDPR Rights */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">GDPR Rights</h2>
                      <p className="text-gray-600">Your data protection rights</p>
                    </div>
                  </div>

                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      GDPR (General Data Protection Regulation) gives you certain rights over how your data is used.
                      We're committed to protecting your personal information and respecting your privacy rights.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Export My Data</h3>
                      <button
                        onClick={handleExportData}
                        disabled={isExporting}
                        className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isExporting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export My Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-rose-900 mb-2">Delete Account</h3>
                      <p className="text-sm text-rose-700 mb-4">
                        This action cannot be reversed. Your account and all associated data will be permanently deleted.
                      </p>
                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 shadow-sm transition-all flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Account
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-rose-900">Are you absolutely sure?</p>
                          <div className="flex gap-3">
                            <button
                              onClick={handleDeleteAccount}
                              className="px-6 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 shadow-sm transition-all"
                            >
                              Yes, Delete Forever
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </MotionDiv>
            )}

            {activeTab === 'payment' && (
              <MotionDiv
                key="payment"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Methods</h2>
                      <p className="text-gray-600">Manage your payment options</p>
                    </div>
                  </div>

                  <Link href="/settings/payment-methods">
                    <button className="w-full px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 shadow-sm transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Manage Payment Methods
                    </button>
                  </Link>
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
