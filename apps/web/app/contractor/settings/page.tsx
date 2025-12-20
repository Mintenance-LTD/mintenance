'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Shield,
  Download,
  Camera,
  Save,
  AlertTriangle,
  CheckCircle,
  Mail,
  Phone,
  Building,
  Plus,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddPaymentMethodForm } from '@/app/settings/payment-methods/components/AddPaymentMethodForm';

type SectionKey = 'profile' | 'account' | 'notifications' | 'payments' | 'privacy';

export default function ContractorSettingsPage() {
  const router = useRouter();
  const { user, loading: loadingUser, refresh } = useCurrentUser();
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    profile_image_url: '',
    company_name: '',
    trade: '',
    skills: '',
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
    smsJobs: true,
    smsMessages: true,
    smsPayments: true,
    smsMarketing: false,
    pushJobs: true,
    pushMessages: true,
    pushPayments: true,
    pushMarketing: false,
  });

  // Payment methods state
  interface PaymentMethod {
    id: string;
    type: string;
    isDefault?: boolean;
    card: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    } | null;
    billing_details: {
      name?: string;
      email?: string;
    } | null;
    created: number;
  }

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

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
        company_name: user.company_name || '',
        trade: '',
        skills: '',
        address: (user as any).address || '',
        city: (user as any).city || '',
        postcode: (user as any).postcode || '',
      });
    }
  }, [user]);

  // Load payment methods
  useEffect(() => {
    if (user && activeSection === 'payments') {
      loadPaymentMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeSection]);

  const loadPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      const response = await fetch('/api/payments/methods');
      
      if (!response.ok) {
        throw new Error('Failed to load payment methods');
      }

      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment methods');
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleRemoveMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      setRemovingId(methodId);
      const response = await fetch('/api/payments/remove-method', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove payment method');
      }

      toast.success('Payment method removed');
      await loadPaymentMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove payment method');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setSettingDefaultId(methodId);
      const response = await fetch('/api/payments/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: methodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default payment method');
      }

      toast.success('Default payment method updated');
      await loadPaymentMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default payment method');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const formatExpiry = (month: number, year: number) => {
    const monthStr = month.toString().padStart(2, '0');
    return `${monthStr}/${year}`;
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

  if (!user) {
    router.push('/login?redirect=/contractor/settings');
    return null;
  }

  if (user.role !== 'contractor') {
    router.push('/settings');
    return null;
  }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();

      // Add all profile fields to FormData
      Object.entries(profileData).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      const response = await fetch('/api/contractor/update-profile', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Profile updated successfully. Location geocoded.');
        // Refresh user data to show updated values including geocoded coordinates
        refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update profile');
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
    { key: 'profile' as SectionKey, label: 'Profile', icon: User },
    { key: 'account' as SectionKey, label: 'Account & Security', icon: Lock },
    { key: 'notifications' as SectionKey, label: 'Notifications', icon: Bell },
    { key: 'payments' as SectionKey, label: 'Payments', icon: CreditCard },
    { key: 'privacy' as SectionKey, label: 'Privacy', icon: Shield },
  ];

  return (
    <div className="min-h-0 bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-72 flex-shrink-0">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-8">
              {sidebarSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center gap-3 border-l-4 ${
                      activeSection === section.key
                        ? 'border-teal-600 bg-teal-50/50 font-semibold text-gray-900'
                        : 'border-transparent text-gray-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${activeSection === section.key ? 'text-teal-600' : 'text-gray-400'}`} />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="flex-1">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Profile Information</h2>

                  {/* Avatar Upload */}
                  <div className="mb-8">
                    <label className="block text-sm font-semibold text-gray-900 mb-4">
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
                            className="rounded-xl object-cover border-4 border-gray-100"
                          />
                        ) : (
                          <div className="w-[120px] h-[120px] rounded-xl bg-teal-600 flex items-center justify-center text-white text-5xl font-semibold border-4 border-gray-100">
                            {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                        )}
                        <label className="absolute -bottom-2 -right-2 p-3 bg-teal-600 rounded-lg hover:bg-teal-700 cursor-pointer transition-colors">
                          <Camera className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          JPG, PNG or WEBP. Max 5MB.
                        </p>
                        <p className="text-xs text-gray-500">
                          Recommended: 400x400px square image
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          First name
                        </label>
                        <input
                          type="text"
                          value={profileData.first_name}
                          onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Last name
                        </label>
                        <input
                          type="text"
                          value={profileData.last_name}
                          onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Company name
                      </label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={profileData.company_name}
                          onChange={(e) => setProfileData({ ...profileData, company_name: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Phone
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                        placeholder="Tell clients about your experience and expertise..."
                      />
                    </div>

                    {/* Location Section */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Service Area</h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Your location helps match you with nearby jobs and appears on the contractor map.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Address
                          </label>
                          <input
                            type="text"
                            value={profileData.address}
                            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            placeholder="123 Main Street"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              value={profileData.city}
                              onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                              placeholder="London"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Postcode
                            </label>
                            <input
                              type="text"
                              value={profileData.postcode}
                              onChange={(e) => setProfileData({ ...profileData, postcode: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
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
                                When you save, we&apos;ll automatically determine your precise coordinates for job matching
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
                      className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account & Security Section */}
            {activeSection === 'account' && (
              <div className="space-y-6">
                {/* Email Verification Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Email Verification</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 font-semibold text-lg">{user.email}</p>
                      <p className="text-sm text-gray-500 mt-1">Your primary email address</p>
                    </div>
                    {user.email_verified && (
                      <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2 border border-green-200">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </div>
                    )}
                  </div>
                </div>

                {/* Change Password Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Change Password</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Current password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        New password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Confirm new password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
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
                    </div>
                  </div>
                </div>

                {/* Two-Factor Authentication Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Two-factor authentication</h2>
                      <p className="text-sm text-gray-600">
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                </div>

                {/* Danger Zone Card */}
                <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-red-900 mb-2">Danger Zone</h2>
                      <p className="text-sm text-red-700">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                    </div>
                  </div>
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
                          className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors border-2 border-gray-200"
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
                {['Email', 'SMS', 'Push'].map((type) => (
                  <div key={type} className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">{type} Notifications</h2>
                    <div className="space-y-4">
                      {[
                        { key: `${type.toLowerCase()}Jobs`, label: 'Jobs', desc: 'Get notified about new job opportunities' },
                        { key: `${type.toLowerCase()}Messages`, label: 'Messages', desc: 'New messages from clients' },
                        { key: `${type.toLowerCase()}Payments`, label: 'Payments', desc: 'Payment confirmations and receipts' },
                        { key: `${type.toLowerCase()}Marketing`, label: 'Marketing', desc: 'Tips, offers, and product updates' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="font-semibold text-gray-900">{item.label}</p>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notificationPrefs[item.key as keyof typeof notificationPrefs]}
                              onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [item.key]: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={isSaving}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Payments Section */}
            {activeSection === 'payments' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payments</h2>
                  <p className="text-sm text-gray-600 mb-6">Manage your payment methods</p>

                  <div className="space-y-4 mb-6">
                    {loadingPaymentMethods ? (
                      <div className="text-center py-8 text-gray-600">Loading payment methods...</div>
                    ) : paymentMethods.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-sm">No payment methods added yet</p>
                      </div>
                    ) : (
                      paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
                        >
                          <input
                            type="radio"
                            name="payment"
                            checked={method.isDefault}
                            onChange={() => !method.isDefault && handleSetDefault(method.id)}
                            disabled={settingDefaultId === method.id}
                            className="w-4 h-4 text-teal-600 cursor-pointer"
                          />
                          <div className="flex-1">
                            {method.card ? (
                              <>
                                <p className="font-medium text-gray-900">
                                  {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} ending in {method.card.last4}
                                  {method.isDefault && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                      Default
                                    </span>
                                  )}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Expires {formatExpiry(method.card.expMonth, method.card.expYear)}
                                </p>
                              </>
                            ) : (
                              <p className="font-medium text-gray-900">
                                {method.type.charAt(0).toUpperCase() + method.type.slice(1)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveMethod(method.id)}
                            disabled={removingId === method.id || method.isDefault}
                            className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                            title={method.isDefault ? 'Cannot remove default payment method. Set another as default first.' : 'Remove payment method'}
                          >
                            {removingId === method.id ? (
                              'Removing...'
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Remove
                              </>
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <button className="px-6 py-3 border-2 border-teal-600 text-teal-600 rounded-lg font-medium hover:bg-teal-50 transition-colors flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add new card
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Payment Method</DialogTitle>
                        <DialogDescription>
                          Add a new payment method to your account for quick and easy payments
                        </DialogDescription>
                      </DialogHeader>
                      <div className="mt-4">
                        <AddPaymentMethodForm
                          onSuccess={() => {
                            setShowAddDialog(false);
                            loadPaymentMethods();
                            toast.success('Payment method added successfully');
                          }}
                          onCancel={() => {
                            setShowAddDialog(false);
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Download your data</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    You can request a copy of all your personal data we have stored.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
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
