'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Shield,
  Download,
  Bot,
  Palette,
} from 'lucide-react';
import { AgentAutomationPanel } from '@/components/agents/AgentAutomationPanel';
import { ProfileSection } from './components/ProfileSection';
import { AccountSecuritySection } from './components/AccountSecuritySection';
import { NotificationsSection } from './components/NotificationsSection';
import { PaymentsSection } from './components/PaymentsSection';
// 2026-05-12: contractors now get the same Mint Editorial theme
// toggle homeowners have. Reusing the shared AppearanceSection so
// the theme-switch UX stays identical across user types and any
// future polish (additional themes, accent picker, etc.) lands in
// one place.
import { AppearanceSection } from '@/app/settings/_components/appearance-section';

import {
  useContractorSettingsData,
  type SectionKey,
} from './useContractorSettingsData';

export default function ContractorSettingsPage() {
  const router = useRouter();
  const {
    user,
    loadingUser,
    activeSection,
    setActiveSection,
    isMintEditorial,
    isExporting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isSaving,
    profileData,
    setProfileData,
    passwordData,
    setPasswordData,
    notificationPrefs,
    setNotificationPrefs,
    paymentMethods,
    loadingPaymentMethods,
    showAddDialog,
    setShowAddDialog,
    removingId,
    settingDefaultId,
    twoFactorEnabled,
    setTwoFactorEnabled,
    handleSaveProfile,
    handleAvatarUpload,
    handleChangePassword,
    handleSaveNotifications,
    handleDeleteAccount,
    handleRemoveMethod,
    handleSetDefault,
    loadPaymentMethods,
    handleExportData,
  } = useContractorSettingsData();

  if (loadingUser) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600 font-medium'>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/contractor/settings');
    return null;
  }
  if (user.role !== 'contractor') {
    router.push('/settings');
    return null;
  }

  const sidebarSections = [
    { key: 'profile' as SectionKey, label: 'Profile', icon: User },
    { key: 'account' as SectionKey, label: 'Account & Security', icon: Lock },
    { key: 'notifications' as SectionKey, label: 'Notifications', icon: Bell },
    { key: 'payments' as SectionKey, label: 'Payments', icon: CreditCard },
    {
      key: 'automation' as SectionKey,
      label: 'AI Agent Automation',
      icon: Bot,
    },
    { key: 'privacy' as SectionKey, label: 'Privacy', icon: Shield },
    { key: 'appearance' as SectionKey, label: 'Appearance', icon: Palette },
  ];

  return (
    <div
      className={isMintEditorial ? 'min-h-0' : 'min-h-0 bg-gray-50'}
      style={isMintEditorial ? { background: 'var(--me-bg)' } : undefined}
    >
      {isMintEditorial ? (
        <div
          className='col'
          style={{
            gap: 4,
            padding: '24px 0 12px',
            maxWidth: 1280,
            margin: '0 auto',
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <h1 className='t-h1'>Settings</h1>
          <p className='t-body'>
            Manage your account settings and preferences.
          </p>
        </div>
      ) : (
        <div className='bg-white border-b border-gray-200'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <h1 className='text-3xl font-semibold text-gray-900'>Settings</h1>
            <p className='text-gray-600 mt-1'>
              Manage your account settings and preferences
            </p>
          </div>
        </div>
      )}

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='flex gap-8'>
          <aside className='w-72 flex-shrink-0'>
            <nav
              className={
                isMintEditorial
                  ? 'card sticky top-8'
                  : 'bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-8'
              }
              style={
                isMintEditorial ? { padding: 6, overflow: 'hidden' } : undefined
              }
            >
              {sidebarSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;
                if (isMintEditorial) {
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        borderRadius: 8,
                        border: 'none',
                        background: isActive
                          ? 'var(--me-brand-soft)'
                          : 'transparent',
                        color: isActive ? 'var(--me-brand)' : 'var(--me-ink-2)',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.75}
                        style={{
                          color: isActive
                            ? 'var(--me-brand)'
                            : 'var(--me-ink-3)',
                        }}
                      />
                      {section.label}
                    </button>
                  );
                }
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3 border-l-4 ${isActive ? 'border-teal-600 bg-teal-50/50 font-semibold text-gray-900' : 'border-transparent text-gray-600'}`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`}
                    />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className='flex-1'>
            {activeSection === 'profile' && (
              <ProfileSection
                user={user}
                profileData={profileData}
                isSaving={isSaving}
                onProfileDataChange={setProfileData}
                onAvatarUpload={handleAvatarUpload}
                onSaveProfile={handleSaveProfile}
              />
            )}
            {activeSection === 'account' && (
              <AccountSecuritySection
                email={user.email}
                emailVerified={
                  ((user as unknown as Record<string, unknown>)
                    .email_verified as boolean) ?? false
                }
                passwordData={passwordData}
                twoFactorEnabled={twoFactorEnabled}
                showDeleteConfirm={showDeleteConfirm}
                isSaving={isSaving}
                onPasswordDataChange={setPasswordData}
                onTwoFactorChange={setTwoFactorEnabled}
                onChangePassword={handleChangePassword}
                onShowDeleteConfirm={setShowDeleteConfirm}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
            {activeSection === 'notifications' && (
              <NotificationsSection
                notificationPrefs={notificationPrefs}
                isSaving={isSaving}
                onPrefsChange={setNotificationPrefs}
                onSave={handleSaveNotifications}
              />
            )}
            {activeSection === 'payments' && (
              <PaymentsSection
                paymentMethods={paymentMethods}
                loadingPaymentMethods={loadingPaymentMethods}
                showAddDialog={showAddDialog}
                removingId={removingId}
                settingDefaultId={settingDefaultId}
                onShowAddDialog={setShowAddDialog}
                onRemoveMethod={handleRemoveMethod}
                onSetDefault={handleSetDefault}
                onPaymentMethodAdded={() => {
                  setShowAddDialog(false);
                  loadPaymentMethods();
                  toast.success('Payment method added successfully');
                }}
              />
            )}
            {activeSection === 'automation' && (
              <div className='space-y-6'>
                <div className='col' style={{ gap: 4, marginBottom: 16 }}>
                  <h1
                    className={
                      isMintEditorial
                        ? 't-h2'
                        : 'text-3xl font-bold text-gray-900 mb-2'
                    }
                  >
                    AI Agent Automation
                  </h1>
                  <p
                    className={
                      isMintEditorial ? 't-body' : 'text-gray-600 mb-6'
                    }
                  >
                    Control how AI agents assist you
                  </p>
                </div>
                <AgentAutomationPanel />
              </div>
            )}
            {activeSection === 'privacy' && (
              <div className='space-y-6'>
                <div
                  className={
                    isMintEditorial
                      ? 'card card-pad'
                      : 'bg-white rounded-xl border border-gray-200 p-6'
                  }
                >
                  <h2
                    className={
                      isMintEditorial
                        ? 't-h3'
                        : 'text-2xl font-semibold text-gray-900 mb-2'
                    }
                    style={isMintEditorial ? { marginBottom: 8 } : undefined}
                  >
                    Download your data
                  </h2>
                  <p
                    className={
                      isMintEditorial ? 't-body' : 'text-sm text-gray-600 mb-6'
                    }
                    style={isMintEditorial ? { marginBottom: 16 } : undefined}
                  >
                    You can request a copy of all your personal data we have
                    stored.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className={
                      isMintEditorial
                        ? 'btn-primary'
                        : 'px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2'
                    }
                  >
                    <Download className='w-4 h-4' />
                    {isExporting ? 'Exporting...' : 'Export my data'}
                  </button>
                </div>
              </div>
            )}
            {activeSection === 'appearance' && (
              <AppearanceSection redirectPath='/contractor/settings?section=appearance' />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
