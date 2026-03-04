'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User as UserIcon, Shield, Bell, Globe, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ProfileHeroHeader } from './components/ProfileHeroHeader';
import { ProfileInfoTab } from './components/ProfileInfoTab';
import { ProfileSecurityTab } from './components/ProfileSecurityTab';
import { ProfileNotificationsTab } from './components/ProfileNotificationsTab';
import { ProfilePreferencesTab } from './components/ProfilePreferencesTab';

type TabId = 'profile' | 'security' | 'notifications' | 'preferences';

export default function ProfilePage2025() {
  const { user, loading, error: userError, refresh } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    postcode: '',
    city: '',
    country: '',
    bio: '',
    joinDate: '',
    accountType: '',
  });

  // Populate form from real user data
  useEffect(() => {
    if (user) {
      setUserData({
        firstName: user.first_name || user.firstName || '',
        lastName: user.last_name || user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: (user as typeof user & { address?: string }).address || user.location || '',
        postcode: (user as typeof user & { postcode?: string }).postcode || '',
        city: user.city || '',
        country: user.country || '',
        bio: user.bio || '',
        joinDate: user.created_at || user.createdAt || '',
        accountType: user.role || '',
      });
    }
  }, [user]);

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: true,
    loginNotifications: true,
    lastPasswordChange: '2025-01-15',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    jobUpdates: true,
    bidAlerts: true,
    messageAlerts: true,
    marketingEmails: false,
  });

  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'Europe/London',
    currency: 'GBP',
    dateFormat: 'DD/MM/YYYY',
  });

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        return undefined;
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return undefined;
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^\+?[\d\s-()]+$/.test(value)) return 'Please enter a valid phone number';
        return undefined;
      case 'postcode':
        if (!value.trim()) return 'Postcode is required';
        if (value.trim().length < 5) return 'Please enter a valid postcode';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleFieldBlur = (field: string) => {
    if (!isEditing) return;
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const value = userData[field as keyof typeof userData];
    const error = validateField(field, String(value));
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) { newErrors[field] = error; }
      else { delete newErrors[field]; }
      return newErrors;
    });
  };

  const handleFieldChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
    if (touchedFields[field] && isEditing) {
      const error = validateField(field, value);
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) { newErrors[field] = error; }
        else { delete newErrors[field]; }
        return newErrors;
      });
    }
  };

  const isFieldValid = (field: string): boolean => {
    return touchedFields[field] && !errors[field] && Boolean(userData[field as keyof typeof userData]);
  };

  const handleSave = useCallback(async () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
    const newErrors: Record<string, string> = {};
    const newTouchedFields: Record<string, boolean> = {};
    requiredFields.forEach(field => {
      newTouchedFields[field] = true;
      const value = userData[field as keyof typeof userData];
      const error = validateField(field, String(value));
      if (error) newErrors[field] = error;
    });
    setTouchedFields(newTouchedFields);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error(`Please fix ${Object.keys(newErrors).length} validation error${Object.keys(newErrors).length > 1 ? 's' : ''}`);
      return;
    }

    setIsSaving(true);
    try {
      // Fetch CSRF token before making the state-changing request
      const csrfRes = await fetch('/api/csrf');
      const { token: csrfToken } = await csrfRes.json();

      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          bio: userData.bio,
          address: userData.address,
          city: userData.city,
          postcode: userData.postcode,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || body.error || 'Failed to update profile');
      }

      setIsEditing(false);
      setTouchedFields({});
      setErrors({});
      toast.success('Profile updated successfully!');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }, [userData, refresh]);

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    setTouchedFields({});
    toast('Changes cancelled');
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load profile. Please sign in.</p>
          <a href="/login" className="text-teal-600 hover:text-teal-700 font-medium">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Back to Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Link
          href={user.role === 'contractor' ? '/contractor/dashboard' : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <ProfileHeroHeader
        firstName={userData.firstName}
        lastName={userData.lastName}
        email={userData.email}
        joinDate={userData.joinDate}
        profileImageUrl={user?.profile_image_url}
        isEditing={isEditing}
        onStartEditing={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onAvatarChange={() => {
          // Avatar upload is handled in Settings > Profile
          window.location.href = '/settings?tab=profile';
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-8"
        >
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </MotionDiv>

        {activeTab === 'profile' && (
          <ProfileInfoTab
            userData={userData}
            isEditing={isEditing}
            errors={errors}
            touchedFields={touchedFields}
            onFieldChange={handleFieldChange}
            onFieldBlur={handleFieldBlur}
            isFieldValid={isFieldValid}
          />
        )}

        {activeTab === 'security' && (
          <ProfileSecurityTab
            securitySettings={securitySettings}
            onSecurityChange={setSecuritySettings}
            onPasswordChange={() => {
              window.location.href = '/settings?tab=account';
            }}
            onDeleteAccount={() => {
              window.location.href = '/settings?tab=privacy';
            }}
          />
        )}

        {activeTab === 'notifications' && (
          <ProfileNotificationsTab
            notificationSettings={notificationSettings}
            onNotificationChange={setNotificationSettings}
          />
        )}

        {activeTab === 'preferences' && (
          <ProfilePreferencesTab
            preferences={preferences}
            onPreferencesChange={setPreferences}
          />
        )}
      </div>
    </div>
  );
}
