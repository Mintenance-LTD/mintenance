'use client';

import React from 'react';
import Image from 'next/image';
import { Camera, Save, Building, Mail, Phone } from 'lucide-react';

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  profile_image_url: string;
  company_name: string;
  trade: string;
  skills: string;
  address: string;
  city: string;
  postcode: string;
}

interface ProfileSectionProps {
  user: { first_name?: string; email: string };
  profileData: ProfileData;
  isSaving: boolean;
  onProfileDataChange: (data: ProfileData) => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProfile: () => void;
}

export function ProfileSection({
  user,
  profileData,
  isSaving,
  onProfileDataChange,
  onAvatarUpload,
  onSaveProfile,
}: ProfileSectionProps) {
  const update = (field: keyof ProfileData, value: string) => {
    onProfileDataChange({ ...profileData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Profile Information</h2>

        {/* Avatar Upload */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-900 mb-4">Profile Photo</label>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profileData.profile_image_url ? (
                <Image src={profileData.profile_image_url} alt="Profile" width={120} height={120} className="rounded-xl object-cover border-4 border-gray-100" />
              ) : (
                <div className="w-[120px] h-[120px] rounded-xl bg-teal-600 flex items-center justify-center text-white text-5xl font-semibold border-4 border-gray-100">
                  {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 p-3 bg-teal-600 rounded-lg hover:bg-teal-700 cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" />
              </label>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">JPG, PNG or WEBP. Max 5MB.</p>
              <p className="text-xs text-gray-500">Recommended: 400x400px square image</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">First name</label>
              <input type="text" value={profileData.first_name} onChange={(e) => update('first_name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Last name</label>
              <input type="text" value={profileData.last_name} onChange={(e) => update('last_name', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Company name</label>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" value={profileData.company_name} onChange={(e) => update('company_name', e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="email" value={profileData.email} onChange={(e) => update('email', e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="tel" value={profileData.phone} onChange={(e) => update('phone', e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
            <textarea value={profileData.bio} onChange={(e) => update('bio', e.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none" placeholder="Tell clients about your experience and expertise..." />
          </div>

          {/* Location Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Service Area</h3>
            <p className="text-sm text-gray-600 mb-6">Your location helps match you with nearby jobs and appears on the contractor map.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Address</label>
                <input type="text" value={profileData.address} onChange={(e) => update('address', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">City</label>
                  <input type="text" value={profileData.city} onChange={(e) => update('city', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" placeholder="London" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Postcode</label>
                  <input type="text" value={profileData.postcode} onChange={(e) => update('postcode', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all" placeholder="SW1A 1AA" />
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
                    <p className="text-xs text-teal-700 mt-1">When you save, we&apos;ll automatically determine your precise coordinates for job matching</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
          <button onClick={onSaveProfile} disabled={isSaving} className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
