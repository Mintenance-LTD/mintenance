'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import { User, Lock, Bell, CreditCard, Shield, Download, Bot } from 'lucide-react';
import { AgentAutomationPanel } from '@/components/agents/AgentAutomationPanel';
import { ProfileSection } from './components/ProfileSection';
import { AccountSecuritySection } from './components/AccountSecuritySection';
import { NotificationsSection } from './components/NotificationsSection';
import { PaymentsSection } from './components/PaymentsSection';

type SectionKey = 'profile' | 'account' | 'notifications' | 'payments' | 'automation' | 'privacy';

type UserWithLocation = { address?: string; city?: string; postcode?: string };

export default function ContractorSettingsPage() {
  const router = useRouter();
  const { user, loading: loadingUser, refresh } = useCurrentUser();
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sectionParam = params.get('section') as SectionKey | null;
      const validSections: SectionKey[] = ['profile', 'account', 'notifications', 'payments', 'automation', 'privacy'];
      if (sectionParam && validSections.includes(sectionParam)) setActiveSection(sectionParam);
    }
  }, []);

  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: '', last_name: '', email: '', phone: '', bio: '',
    profile_image_url: '', company_name: '', trade: '', skills: '',
    address: '', city: '', postcode: '',
  });

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [notificationPrefs, setNotificationPrefs] = useState({
    emailJobs: true, emailMessages: true, emailPayments: true, emailMarketing: false,
    smsJobs: true, smsMessages: true, smsPayments: true, smsMarketing: false,
    pushJobs: true, pushMessages: true, pushPayments: true, pushMarketing: false,
  });

  interface PaymentMethod {
    id: string; type: string; isDefault?: boolean;
    card: { brand: string; last4: string; expMonth: number; expYear: number } | null;
    billing_details: { name?: string; email?: string } | null;
    created: number;
  }

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      const userLoc = user as typeof user & UserWithLocation;
      setProfileData({
        first_name: user.first_name || '', last_name: user.last_name || '',
        email: user.email || '', phone: user.phone || '', bio: user.bio || '',
        profile_image_url: user.profile_image_url || '', company_name: user.company_name || '',
        trade: '', skills: '', address: userLoc.address || '',
        city: userLoc.city || '', postcode: userLoc.postcode || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && activeSection === 'payments') loadPaymentMethods();
  }, [user, activeSection]);

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const response = await fetch('/api/payments/methods');
      if (!response.ok) throw new Error('Failed to load payment methods');
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleRemoveMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    try {
      setRemovingId(methodId);
      // Fetch fresh CSRF token before mutation
      const csrfRes = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
      const { token: csrfToken } = csrfRes.ok ? await csrfRes.json() : { token: '' };
      if (csrfToken) await new Promise(r => setTimeout(r, 50));

      const response = await fetch('/api/payments/remove-method', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ paymentMethodId: methodId }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to remove payment method'); }
      toast.success('Payment method removed');
      await loadPaymentMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove payment method');
    } finally { setRemovingId(null); }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setSettingDefaultId(methodId);
      // Fetch fresh CSRF token before mutation
      const csrfRes = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
      const { token: csrfToken } = csrfRes.ok ? await csrfRes.json() : { token: '' };
      if (csrfToken) await new Promise(r => setTimeout(r, 50));

      const response = await fetch('/api/payments/set-default', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ paymentMethodId: methodId }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to set default payment method'); }
      toast.success('Default payment method updated');
      await loadPaymentMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default payment method');
    } finally { setSettingDefaultId(null); }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) { router.push('/login?redirect=/contractor/settings'); return null; }
  if (user.role !== 'contractor') { router.push('/settings'); return null; }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('firstName', profileData.first_name);
      formData.append('lastName', profileData.last_name);
      if (profileData.bio) formData.append('bio', profileData.bio);
      if (profileData.city) formData.append('city', profileData.city);
      if (profileData.phone) formData.append('phone', profileData.phone);
      if (profileData.company_name) formData.append('companyName', profileData.company_name);
      if (profileData.address) formData.append('address', profileData.address);
      if (profileData.postcode) formData.append('postcode', profileData.postcode);
      formData.append('isAvailable', String((user as typeof user & { is_available?: boolean }).is_available !== false));
      const response = await fetch('/api/contractor/update-profile', { method: 'POST', body: formData });
      if (response.ok) { toast.success('Profile updated successfully. Location geocoded.'); refresh(); }
      else { const error = await response.json(); toast.error(error.message || 'Failed to update profile'); }
    } catch (error) { toast.error('Error updating profile'); }
    finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Passwords do not match'); return; }
    setIsSaving(true);
    try { toast.success('Password changed successfully'); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    catch (error) { toast.error('Error changing password'); }
    finally { setIsSaving(false); }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try { toast.success('Notification preferences updated'); }
    catch (error) { toast.error('Error updating notification preferences'); }
    finally { setIsSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('profileImage', file);
    try {
      const response = await fetch('/api/user/update-profile', { method: 'POST', body: formData });
      if (response.ok) { const data = await response.json(); if (data.profileImageUrl) { setProfileData({ ...profileData, profile_image_url: data.profileImageUrl }); toast.success('Profile picture updated'); } }
      else toast.error('Failed to upload image');
    } catch (error) { toast.error('Error uploading image'); }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/user/export-data', { method: 'POST' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'my-data.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Data exported successfully!');
      } else toast.error('Failed to export data');
    } catch (error) { toast.error('Error exporting data'); }
    finally { setIsExporting(false); }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/user/delete-account', { method: 'DELETE' });
      if (response.ok) { toast.success('Account deleted successfully'); window.location.href = '/login?deleted=true'; }
      else toast.error('Failed to delete account');
    } catch (error) { toast.error('Error deleting account'); }
  };

  const sidebarSections = [
    { key: 'profile' as SectionKey, label: 'Profile', icon: User },
    { key: 'account' as SectionKey, label: 'Account & Security', icon: Lock },
    { key: 'notifications' as SectionKey, label: 'Notifications', icon: Bell },
    { key: 'payments' as SectionKey, label: 'Payments', icon: CreditCard },
    { key: 'automation' as SectionKey, label: 'AI Agent Automation', icon: Bot },
    { key: 'privacy' as SectionKey, label: 'Privacy', icon: Shield },
  ];

  return (
    <div className="min-h-0 bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="w-72 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-8">
              {sidebarSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button key={section.key} onClick={() => setActiveSection(section.key)}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3 border-l-4 ${activeSection === section.key ? 'border-teal-600 bg-teal-50/50 font-semibold text-gray-900' : 'border-transparent text-gray-600'}`}>
                    <Icon className={`w-5 h-5 ${activeSection === section.key ? 'text-teal-600' : 'text-gray-400'}`} />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            {activeSection === 'profile' && (
              <ProfileSection user={user} profileData={profileData} isSaving={isSaving} onProfileDataChange={setProfileData} onAvatarUpload={handleAvatarUpload} onSaveProfile={handleSaveProfile} />
            )}
            {activeSection === 'account' && (
              <AccountSecuritySection
                email={user.email} emailVerified={(user as unknown as Record<string, unknown>).email_verified as boolean ?? false} passwordData={passwordData}
                twoFactorEnabled={twoFactorEnabled} showDeleteConfirm={showDeleteConfirm} isSaving={isSaving}
                onPasswordDataChange={setPasswordData} onTwoFactorChange={setTwoFactorEnabled}
                onChangePassword={handleChangePassword} onShowDeleteConfirm={setShowDeleteConfirm} onDeleteAccount={handleDeleteAccount}
              />
            )}
            {activeSection === 'notifications' && (
              <NotificationsSection notificationPrefs={notificationPrefs} isSaving={isSaving} onPrefsChange={setNotificationPrefs} onSave={handleSaveNotifications} />
            )}
            {activeSection === 'payments' && (
              <PaymentsSection
                paymentMethods={paymentMethods} loadingPaymentMethods={loadingPaymentMethods}
                showAddDialog={showAddDialog} removingId={removingId} settingDefaultId={settingDefaultId}
                onShowAddDialog={setShowAddDialog} onRemoveMethod={handleRemoveMethod} onSetDefault={handleSetDefault}
                onPaymentMethodAdded={() => { setShowAddDialog(false); loadPaymentMethods(); toast.success('Payment method added successfully'); }}
              />
            )}
            {activeSection === 'automation' && (
              <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Agent Automation</h1>
                <p className="text-gray-600 mb-6">Control how AI agents assist you</p>
                <AgentAutomationPanel />
              </div>
            )}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Download your data</h2>
                  <p className="text-sm text-gray-600 mb-6">You can request a copy of all your personal data we have stored.</p>
                  <button onClick={handleExportData} disabled={isExporting} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Export my data'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
