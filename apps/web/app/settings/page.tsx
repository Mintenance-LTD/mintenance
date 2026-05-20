'use client';

import React from 'react';
import { AgentAutomationPanel } from '@/components/agents/AgentAutomationPanel';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { useSettingsState } from './_components/use-settings-state';
import { SettingsSidebar } from './_components/settings-sidebar';
import { ProfileSection } from './_components/profile-section';
import { AccountSecuritySection } from './_components/account-security-section';
import { NotificationsSection } from './_components/notifications-section';
import { AppearanceSection } from './_components/appearance-section';
import { PhoneVerificationDialog } from './_components/phone-verification-dialog';

/**
 * /settings — Direction A · Mint Editorial.
 *
 * 2026-05-15 design-system rebuild. The content subtree is wrapped in
 * `data-theme='mint-editorial' .me-root` so the `--me-*` tokens +
 * `.card` / `.field` / `.t-h1` primitives resolve regardless of the
 * user's global theme cookie — settings always renders in Mint
 * Editorial (this is also the page that hosts the theme toggle).
 *
 * `me-legacy-fit` is kept on the wrapper because the embedded
 * `AgentAutomationPanel` is still a legacy Tailwind component; the
 * shim maps its classes onto the Mint palette.
 */
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
  const { user, loadingUser, activeSection, setActiveSection } = settings;

  if (loadingUser) {
    return (
      <div
        data-theme='mint-editorial'
        className='me-root'
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className='animate-spin'
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              border: '4px solid var(--me-brand-soft)',
              borderTopColor: 'var(--me-brand)',
              margin: '0 auto 14px',
            }}
          />
          <p style={{ color: 'var(--me-ink-3)', fontSize: 14 }}>
            Loading settings…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userInitial =
    user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase();

  return (
    <HomeownerPageWrapper>
      <div
        data-theme='mint-editorial'
        className='me-root me-legacy-fit settings-page'
        style={{ padding: '28px 32px' }}
      >
        <div style={{ display: 'flex', gap: 28, maxWidth: 1180 }}>
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          <main style={{ flex: 1, minWidth: 0 }}>
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
              <div>
                <h1 className='t-h1' style={{ marginBottom: 4 }}>
                  AI &amp; Automation
                </h1>
                <p className='t-body' style={{ margin: '0 0 20px' }}>
                  Control how AI agents assist you with bids, pricing,
                  scheduling, and more.
                </p>
                <AgentAutomationPanel />
              </div>
            )}

            {activeSection === 'payments' && (
              <div>
                <h1 className='t-h1' style={{ marginBottom: 4 }}>
                  Payments
                </h1>
                <p className='t-body' style={{ margin: '0 0 20px' }}>
                  Manage your payment methods
                </p>
                <div className='card' style={{ padding: 28 }}>
                  <h2 className='t-h3' style={{ marginBottom: 18 }}>
                    Payment methods
                  </h2>
                  {settings.loadingPayments ? (
                    <p
                      style={{
                        color: 'var(--me-ink-3)',
                        fontSize: 14,
                        padding: '8px 0',
                      }}
                    >
                      Loading payment methods…
                    </p>
                  ) : settings.paymentMethods.length === 0 ? (
                    <p
                      style={{
                        color: 'var(--me-ink-3)',
                        fontSize: 14,
                        padding: '8px 0',
                      }}
                    >
                      No payment methods on file. Add one to get started.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      {settings.paymentMethods.map((pm) => (
                        <div
                          key={pm.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: 14,
                            border: '1px solid var(--me-line)',
                            borderRadius: 'var(--me-radius-input)',
                          }}
                        >
                          <input
                            type='radio'
                            name='payment'
                            defaultChecked={pm.isDefault}
                            readOnly
                            style={{ accentColor: 'var(--me-brand)' }}
                          />
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                margin: 0,
                                fontWeight: 600,
                                fontSize: 14,
                                color: 'var(--me-ink)',
                                textTransform: 'capitalize',
                              }}
                            >
                              {pm.brand} ending in {pm.last4}
                            </p>
                            <p
                              style={{
                                margin: '2px 0 0',
                                fontSize: 13,
                                color: 'var(--me-ink-3)',
                              }}
                            >
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
                    className='btn btn-secondary'
                  >
                    Manage payment methods
                  </a>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && <AppearanceSection />}

            {activeSection === 'privacy' && (
              <div>
                <h1 className='t-h1' style={{ marginBottom: 4 }}>
                  Privacy
                </h1>
                <p className='t-body' style={{ margin: '0 0 20px' }}>
                  Manage your privacy and data
                </p>

                {/* Privacy Controls */}
                <div className='card' style={{ padding: 28, marginBottom: 20 }}>
                  <h2 className='t-h3' style={{ marginBottom: 8 }}>
                    Privacy controls
                  </h2>

                  <PrivacyToggleRow
                    title='Profile visible'
                    description='Allow other users to see your profile in search results and contractor listings'
                    checked={settings.privacySettings?.profileVisible !== false}
                    onToggle={() =>
                      settings.handleTogglePrivacy('profileVisible')
                    }
                    first
                  />
                  <PrivacyToggleRow
                    title='Share activity data'
                    description='Help improve Mintenance by sharing anonymised usage data'
                    checked={!!settings.privacySettings?.shareActivityData}
                    onToggle={() =>
                      settings.handleTogglePrivacy('shareActivityData')
                    }
                  />
                </div>

                {/* Data Export */}
                <div className='card' style={{ padding: 28 }}>
                  <h2 className='t-h3' style={{ marginBottom: 8 }}>
                    Download your data
                  </h2>
                  <p
                    style={{
                      margin: '0 0 16px',
                      fontSize: 13,
                      color: 'var(--me-ink-2)',
                    }}
                  >
                    You can request a copy of all your personal data we have
                    stored.
                  </p>
                  <button
                    onClick={settings.handleExportData}
                    disabled={settings.isExporting}
                    className='btn btn-primary'
                    style={{ opacity: settings.isExporting ? 0.6 : 1 }}
                  >
                    {settings.isExporting ? 'Exporting…' : 'Export my data'}
                  </button>
                </div>
              </div>
            )}
          </main>
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

/** Privacy toggle row — Mint Editorial token-styled switch. */
function PrivacyToggleRow({
  title,
  description,
  checked,
  onToggle,
  first,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  first?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 0',
        borderTop: first ? 'none' : '1px solid var(--me-line-2)',
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--me-ink)',
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 13,
            color: 'var(--me-ink-3)',
          }}
        >
          {description}
        </p>
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        aria-label={title}
        onClick={onToggle}
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 9999,
          border: 0,
          flexShrink: 0,
          cursor: 'pointer',
          background: checked ? 'var(--me-brand)' : 'var(--me-line)',
          transition: 'background 0.15s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: 9999,
            background: 'var(--me-surface)',
            boxShadow: '0 1px 2px rgba(31,42,36,0.25)',
            transition: 'left 0.15s ease',
          }}
        />
      </button>
    </div>
  );
}
