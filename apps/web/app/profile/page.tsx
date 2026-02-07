// TODO: Replace mock user data with real Supabase data fetching.
// This page currently renders hardcoded placeholder values for demonstration purposes.
// To connect to real data:
//   1. Import `useCurrentUser` from `@/hooks/useCurrentUser`
//   2. Fetch the full user profile from Supabase via `/api/profile` or a direct query
//   3. Populate `userData` state from the fetched profile
//   4. Wire `handleSave` to persist changes via a PATCH/PUT to the API
//   5. Wire `handleAvatarChange` to upload images to Supabase Storage
//   6. Wire `handlePasswordChange` to Supabase Auth password update
//   7. Remove the `DEMO_DATA` flag and the demo banner once complete

'use client';

import React, { useState } from 'react';
import { User, Shield, Bell, Globe, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { ProfileHeroHeader } from './components/ProfileHeroHeader';
import { ProfileInfoTab } from './components/ProfileInfoTab';
import { ProfileSecurityTab } from './components/ProfileSecurityTab';
import { ProfileNotificationsTab } from './components/ProfileNotificationsTab';
import { ProfilePreferencesTab } from './components/ProfilePreferencesTab';

/** Flag indicating this page uses placeholder data rather than live Supabase queries. */
const DEMO_DATA = true;

type TabId = 'profile' | 'security' | 'notifications' | 'preferences';

export default function ProfilePage2025() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // DEMO: Mock user data -- replace with real Supabase profile fetch (see TODO at top of file)
  const [userData, setUserData] = useState({
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+44 7700 900123',
    address: '123 Oak Street, London',
    postcode: 'SW1A 1AA',
    city: 'London',
    country: 'United Kingdom',
    bio: 'Homeowner passionate about property maintenance and home improvement projects.',
    joinDate: '2024-03-15',
    accountType: 'Premium',
  });

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

  const handleSave = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'postcode'];
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
    setIsEditing(false);
    setTouchedFields({});
    setErrors({});
    toast.success('Profile updated successfully!');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    setTouchedFields({});
    toast('Changes cancelled');
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Demo Data Banner */}
      {DEMO_DATA && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Demo Data</span> &mdash; This profile is showing placeholder information. Connect your account to see real data.
            </p>
          </div>
        </div>
      )}

      <ProfileHeroHeader
        firstName={userData.firstName}
        lastName={userData.lastName}
        email={userData.email}
        joinDate={userData.joinDate}
        isEditing={isEditing}
        onStartEditing={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        onAvatarChange={() => toast.success('Avatar updated!')}
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
            onPasswordChange={() => toast.success('Password change email sent!')}
            onDeleteAccount={() => toast.error('Account deletion requested - you will receive a confirmation email')}
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
