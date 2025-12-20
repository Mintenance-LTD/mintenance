'use client';

import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  X,
  Edit,
  Bell,
  Lock,
  CreditCard,
  Globe,
  Calendar,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';
import { FormField, ValidatedInput, ValidatedTextarea } from '@/components/ui/FormField';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ProfilePage2025() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Mock user data - replace with actual user data
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
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const handleFieldChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
    // If field was touched, validate on change for immediate feedback
    if (touchedFields[field] && isEditing) {
      const error = validateField(field, value);
      setErrors(prev => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[field] = error;
        } else {
          delete newErrors[field];
        }
        return newErrors;
      });
    }
  };

  const isFieldValid = (field: string): boolean => {
    return touchedFields[field] && !errors[field] && Boolean(userData[field as keyof typeof userData]);
  };

  const handleSave = () => {
    // Validate all required fields
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

  const handleAvatarChange = () => {
    toast.success('Avatar updated!');
  };

  const handlePasswordChange = () => {
    toast.success('Password change email sent!');
  };

  const handleDeleteAccount = () => {
    toast.error('Account deletion requested - you will receive a confirmation email');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Header */}
      <MotionDiv
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center overflow-hidden">
                  <User className="w-12 h-12 text-white" />
                </div>
                <button
                  onClick={handleAvatarChange}
                  className="absolute bottom-0 right-0 bg-white text-teal-600 p-2 rounded-full hover:bg-teal-50 transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {userData.firstName} {userData.lastName}
                </h1>
                <div className="flex items-center gap-4 text-teal-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{userData.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {new Date(userData.joinDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {!isEditing ? (
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
              >
                <Edit className="w-5 h-5" />
                Edit Profile
              </MotionButton>
            ) : (
              <div className="flex gap-3">
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancel}
                  className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </MotionButton>
              </div>
            )}
          </div>
        </div>
      </MotionDiv>

      {/* Main Content */}
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
                  onClick={() => setActiveTab(tab.id as any)}
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

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="First Name"
                required
                error={isEditing && touchedFields.firstName ? errors.firstName : undefined}
                success={isFieldValid('firstName')}
                helperText={isFieldValid('firstName') ? 'Looks good!' : undefined}
                htmlFor="profile-firstName"
              >
                <ValidatedInput
                  id="profile-firstName"
                  type="text"
                  value={userData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  onBlur={() => handleFieldBlur('firstName')}
                  disabled={!isEditing}
                  error={Boolean(isEditing && touchedFields.firstName && errors.firstName)}
                  success={isFieldValid('firstName')}
                />
              </FormField>

              <FormField
                label="Last Name"
                required
                error={isEditing && touchedFields.lastName ? errors.lastName : undefined}
                success={isFieldValid('lastName')}
                helperText={isFieldValid('lastName') ? 'Looks good!' : undefined}
                htmlFor="profile-lastName"
              >
                <ValidatedInput
                  id="profile-lastName"
                  type="text"
                  value={userData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  onBlur={() => handleFieldBlur('lastName')}
                  disabled={!isEditing}
                  error={Boolean(isEditing && touchedFields.lastName && errors.lastName)}
                  success={isFieldValid('lastName')}
                />
              </FormField>

              <FormField
                label="Email"
                required
                error={isEditing && touchedFields.email ? errors.email : undefined}
                success={isFieldValid('email')}
                helperText={isFieldValid('email') ? 'Email verified' : undefined}
                htmlFor="profile-email"
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <ValidatedInput
                    id="profile-email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    disabled={!isEditing}
                    error={Boolean(isEditing && touchedFields.email && errors.email)}
                    success={isFieldValid('email')}
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField
                label="Phone"
                required
                error={isEditing && touchedFields.phone ? errors.phone : undefined}
                success={isFieldValid('phone')}
                helperText={isFieldValid('phone') ? 'Phone number verified' : undefined}
                htmlFor="profile-phone"
              >
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                  <ValidatedInput
                    id="profile-phone"
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    disabled={!isEditing}
                    error={Boolean(isEditing && touchedFields.phone && errors.phone)}
                    success={isFieldValid('phone')}
                    className="pl-10"
                  />
                </div>
              </FormField>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={userData.address}
                    onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={userData.city}
                  onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                <input
                  type="text"
                  value={userData.postcode}
                  onChange={(e) => setUserData({ ...userData, postcode: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={userData.bio}
                  onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
          </MotionDiv>
        )}

        {activeTab === 'security' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Password Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Password & Authentication</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Password</p>
                      <p className="text-sm text-gray-500">
                        Last changed: {new Date(securitySettings.lastPasswordChange).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handlePasswordChange}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Change Password
                  </MotionButton>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500">
                        {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorEnabled}
                      onChange={(e) =>
                        setSecuritySettings({ ...securitySettings, twoFactorEnabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Login Notifications</p>
                      <p className="text-sm text-gray-500">Get notified of new login attempts</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.loginNotifications}
                      onChange={(e) =>
                        setSecuritySettings({ ...securitySettings, loginNotifications: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
              <h2 className="text-2xl font-bold text-red-900 mb-6">Danger Zone</h2>

              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Delete Account</h3>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete your account, there is no going back. This action cannot be undone.
                  </p>
                  <MotionButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                  </MotionButton>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}

        {activeTab === 'notifications' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

            <div className="space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-500">
                      {key === 'emailNotifications' && 'Receive notifications via email'}
                      {key === 'smsNotifications' && 'Receive notifications via SMS'}
                      {key === 'pushNotifications' && 'Receive push notifications'}
                      {key === 'jobUpdates' && 'Get updates about your jobs'}
                      {key === 'bidAlerts' && 'Get alerts about new bids'}
                      {key === 'messageAlerts' && 'Get notified of new messages'}
                      {key === 'marketingEmails' && 'Receive promotional emails'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toast.success('Notification preferences saved!')}
                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Save Preferences
              </MotionButton>
            </div>
          </MotionDiv>
        )}

        {activeTab === 'preferences' && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">App Preferences</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="Europe/London">London (GMT)</option>
                  <option value="America/New_York">New York (EST)</option>
                  <option value="America/Los_Angeles">Los Angeles (PST)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={preferences.currency}
                  onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toast.success('Preferences saved!')}
                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Save Preferences
              </MotionButton>
            </div>
          </MotionDiv>
        )}
      </div>
    </div>
  );
}
