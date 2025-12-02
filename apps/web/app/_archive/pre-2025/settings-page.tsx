'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { PageHeader } from '@/components/layouts/PageHeader';
import { PrivacyPolicyContent } from '@/components/settings/PrivacyPolicyContent';
import { TermsOfServiceContent } from '@/components/settings/TermsOfServiceContent';
import { GDPRSettings } from './components/GDPRSettings';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [showPrivacyDialog, setShowPrivacyDialog] = React.useState(false);
  const [showTermsDialog, setShowTermsDialog] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('account');

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-teal-600 font-medium">Loading settings...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/login?redirect=/settings');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-500 mb-6">
            You must be logged in to access settings.
          </p>
          <Link href="/login?redirect=/settings" className="inline-block">
            <Button variant="primary">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const tabs = [
    { id: 'account', label: 'Account Actions' },
    { id: 'security', label: 'Security' },
    { id: 'privacy', label: 'Data Privacy & GDPR' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UnifiedSidebar
        userRole="homeowner"
        userInfo={{
          name: userDisplayName,
          email: user.email,
          avatar: user.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        <PageHeader
          title="Settings"
          subtitle="Account Actions, Security, Data Privacy & GDPR"
          darkBackground={true}
          userName={userDisplayName}
          userAvatar={user.profile_image_url}
        />

        <div className="p-8 max-w-4xl">
          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Account Actions Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Profile Information Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 text-xl font-bold border border-teal-100">
                    {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 m-0">
                      Profile Information
                    </h2>
                    <p className="text-sm text-gray-500 m-0">
                      Your account details
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Name
                    </div>
                    <div className="text-base text-gray-900 font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Email
                    </div>
                    <div className="text-base text-gray-900 font-medium flex items-center gap-2">
                      {user.email}
                      {user.email_verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-xs font-semibold border border-emerald-100">
                          <Icon name="check" size={12} />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Account Type
                    </div>
                    <div className="text-base text-gray-900 font-medium capitalize">
                      {user.role}
                    </div>
                  </div>
                </div>

                <Link href="/profile" className="mt-6 block w-full">
                  <button className="w-full px-6 py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-colors">
                    Edit Profile
                  </button>
                </Link>
              </div>

              {/* Account Actions Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/settings/payment-methods"
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-base font-medium text-gray-700 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                  >
                    <Icon name="creditCard" size={20} />
                    <span>Payment Methods</span>
                  </Link>
                  <button
                    onClick={() => setShowPrivacyDialog(true)}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-base font-medium text-gray-700 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                  >
                    <Icon name="shield" size={20} />
                    <span>Privacy Policy</span>
                  </button>
                  <button
                    onClick={() => setShowTermsDialog(true)}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-base font-medium text-gray-700 flex items-center gap-3 hover:bg-gray-100 transition-colors"
                  >
                    <Icon name="document" size={20} />
                    <span>Terms of Service</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Icon name="lock" size={24} className="text-gray-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 m-0">
                    Security
                  </h2>
                  <p className="text-sm text-gray-500 m-0">
                    Protect your account
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Contact support to change your password or manage your security settings.
              </p>

              <Link href="/help" className="block">
                <button className="w-full px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors">
                  <Icon name="help" size={16} className="inline mr-2" />
                  Contact Support
                </button>
              </Link>
            </div>
          )}

          {/* Data Privacy & GDPR Tab */}
          {activeTab === 'privacy' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <GDPRSettings />
            </div>
          )}
        </div>

        {/* Privacy Policy Dialog */}
        <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Privacy Policy</DialogTitle>
              <DialogDescription>
                How we collect, use, and protect your personal information
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <PrivacyPolicyContent />
            </div>
          </DialogContent>
        </Dialog>

        {/* Terms of Service Dialog */}
        <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Terms of Service</DialogTitle>
              <DialogDescription>
                Rules and guidelines for using our platform
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <TermsOfServiceContent />
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}


