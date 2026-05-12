'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AgentAutomationPanel } from '@/components/agents/AgentAutomationPanel';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { useSettingsState } from './_components/use-settings-state';
import { SettingsSidebar } from './_components/settings-sidebar';
import { ProfileSection } from './_components/profile-section';
import { AccountSecuritySection } from './_components/account-security-section';
import { NotificationsSection } from './_components/notifications-section';
import { AppearanceSection } from './_components/appearance-section';
import { PhoneVerificationDialog } from './_components/phone-verification-dialog';

export default function SettingsPage2025({
  params,
  searchParams,
}: {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  // Note: params and searchParams are Promises in Next.js 16, but we use hooks instead
  // Accepting them here prevents React DevTools serialization errors
  const settings = useSettingsState();
  const { user, loadingUser, router, activeSection, setActiveSection } =
    settings;

  // Hide the legacy "Back to Dashboard" link + suppress the legacy
  // outer `min-h-screen bg-gray-50` strip when the Mint Editorial
  // shell is active — the persistent sidebar already provides nav
  // and a page background.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (loadingUser) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userInitial =
    user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase();

  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      <div
        className={
          isMintEditorial
            ? 'settings-page'
            : 'min-h-screen bg-gray-50 settings-page'
        }
      >
        <div
          className={
            isMintEditorial ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
          }
        >
          {/* Back to Dashboard Button — legacy only; the shell sidebar
              already provides global navigation. */}
          {!isMintEditorial && (
            <button
              onClick={() => router.push('/dashboard')}
              className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-6'
            >
              <ArrowLeft className='w-5 h-5' />
              <span className='font-medium'>Back to Dashboard</span>
            </button>
          )}

          <div className='flex gap-8'>
            <SettingsSidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />

            <main className='flex-1'>
              {activeSection === 'profile' && (
                <ProfileSection
                  userInitial={userInitial}
                  profileData={settings.profileData}
                  setProfileData={settings.setProfileData}
                  isSaving={settings.isSaving}
                  onSave={settings.handleSaveProfile}
                  onReset={settings.handleResetProfile}
                  onAvatarUpload={settings.handleAvatarUpload}
                />
              )}

              {activeSection === 'account' && (
                <AccountSecuritySection
                  user={{
                    email: user.email,
                    phone: user.phone,
                    email_verified: user.email_verified,
                    phone_verified: user.phone_verified,
                  }}
                  passwordData={settings.passwordData}
                  setPasswordData={settings.setPasswordData}
                  twoFactorEnabled={settings.twoFactorEnabled}
                  setTwoFactorEnabled={settings.setTwoFactorEnabled}
                  showDeleteConfirm={settings.showDeleteConfirm}
                  setShowDeleteConfirm={settings.setShowDeleteConfirm}
                  isSaving={settings.isSaving}
                  csrfToken={settings.csrfToken}
                  onChangePassword={settings.handleChangePassword}
                  onDeleteAccount={settings.handleDeleteAccount}
                  onSendVerificationCode={settings.handleSendVerificationCode}
                  onAddPhoneNumber={settings.handleAddPhoneNumber}
                  onUpdatePhoneNumber={settings.handleUpdatePhoneNumber}
                />
              )}

              {activeSection === 'notifications' && (
                <NotificationsSection
                  notificationPrefs={settings.notificationPrefs}
                  setNotificationPrefs={settings.setNotificationPrefs}
                  isSaving={settings.isSaving}
                  onSave={settings.handleSaveNotifications}
                />
              )}

              {activeSection === 'automation' && (
                <div className='space-y-6'>
                  <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                    AI & Automation
                  </h1>
                  <p className='text-gray-600 mb-6'>
                    Control how AI agents assist you with bids, pricing,
                    scheduling, and more.
                  </p>
                  <AgentAutomationPanel />
                </div>
              )}

              {activeSection === 'payments' && (
                <div className='space-y-6'>
                  <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                    Payments
                  </h1>
                  <p className='text-gray-600 mb-6'>
                    Manage your payment methods
                  </p>
                  <div className='bg-white rounded-xl border border-gray-200 p-8'>
                    <h2 className='text-xl font-semibold text-gray-900 mb-6'>
                      Payment methods
                    </h2>
                    {settings.loadingPayments ? (
                      <p className='text-gray-500 py-4'>
                        Loading payment methods...
                      </p>
                    ) : settings.paymentMethods.length === 0 ? (
                      <p className='text-gray-500 py-4'>
                        No payment methods on file. Add one to get started.
                      </p>
                    ) : (
                      <div className='space-y-4 mb-6'>
                        {settings.paymentMethods.map((pm) => (
                          <div
                            key={pm.id}
                            className='flex items-center gap-4 p-4 border border-gray-200 rounded-lg'
                          >
                            <input
                              type='radio'
                              name='payment'
                              defaultChecked={pm.isDefault}
                              className='w-4 h-4 text-teal-600'
                              readOnly
                            />
                            <div className='flex-1'>
                              <p className='font-medium text-gray-900 capitalize'>
                                {pm.brand} ending in {pm.last4}
                              </p>
                              <p className='text-sm text-gray-500'>
                                Expires {String(pm.expMonth).padStart(2, '0')}/
                                {pm.expYear}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <a
                      href='/settings/payment-methods'
                      className='inline-block px-6 py-3 border-2 border-teal-600 text-teal-600 rounded-lg font-medium hover:bg-teal-50 transition-colors'
                    >
                      Manage payment methods
                    </a>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && <AppearanceSection />}

              {activeSection === 'privacy' && (
                <div className='space-y-6'>
                  <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                    Privacy
                  </h1>
                  <p className='text-gray-600 mb-6'>
                    Manage your privacy and data
                  </p>

                  {/* Privacy Controls */}
                  <div className='bg-white rounded-xl border border-gray-200 p-8 space-y-6'>
                    <h2 className='text-xl font-semibold text-gray-900'>
                      Privacy Controls
                    </h2>

                    <div className='flex items-center justify-between py-3 border-b border-gray-100'>
                      <div>
                        <p className='font-medium text-gray-900'>
                          Profile Visible
                        </p>
                        <p className='text-sm text-gray-500'>
                          Allow other users to see your profile in search
                          results and contractor listings
                        </p>
                      </div>
                      <button
                        type='button'
                        role='switch'
                        aria-checked={
                          settings.privacySettings?.profileVisible ?? true
                        }
                        onClick={() =>
                          settings.handleTogglePrivacy('profileVisible')
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.privacySettings?.profileVisible !== false
                            ? 'bg-teal-600'
                            : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.privacySettings?.profileVisible !== false
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className='flex items-center justify-between py-3'>
                      <div>
                        <p className='font-medium text-gray-900'>
                          Share Activity Data
                        </p>
                        <p className='text-sm text-gray-500'>
                          Help improve Mintenance by sharing anonymised usage
                          data
                        </p>
                      </div>
                      <button
                        type='button'
                        role='switch'
                        aria-checked={
                          settings.privacySettings?.shareActivityData ?? false
                        }
                        onClick={() =>
                          settings.handleTogglePrivacy('shareActivityData')
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.privacySettings?.shareActivityData
                            ? 'bg-teal-600'
                            : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.privacySettings?.shareActivityData
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Data Export */}
                  <div className='bg-white rounded-xl border border-gray-200 p-8'>
                    <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                      Download your data
                    </h2>
                    <p className='text-sm text-gray-600 mb-4'>
                      You can request a copy of all your personal data we have
                      stored.
                    </p>
                    <button
                      onClick={settings.handleExportData}
                      disabled={settings.isExporting}
                      className='px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50'
                    >
                      {settings.isExporting ? 'Exporting...' : 'Export my data'}
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>

        <PhoneVerificationDialog
          isOpen={settings.showVerificationDialog}
          verificationCode={settings.verificationCode}
          setVerificationCode={settings.setVerificationCode}
          verificationPhoneNumber={settings.verificationPhoneNumber}
          isSaving={settings.isSaving}
          onVerify={settings.handleVerifyCode}
          onCancel={settings.handleCancelVerification}
          onResend={settings.handleResendCode}
        />
      </div>
    </HomeownerPageWrapper>
  );
}
