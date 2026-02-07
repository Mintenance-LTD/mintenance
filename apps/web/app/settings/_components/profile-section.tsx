import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import type { ProfileData } from './types';

interface ProfileSectionProps {
  userInitial: string;
  profileData: ProfileData;
  setProfileData: Dispatch<SetStateAction<ProfileData>>;
  isSaving: boolean;
  onSave: () => Promise<void>;
  onReset: () => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function ProfileSection({
  userInitial,
  profileData,
  setProfileData,
  isSaving,
  onSave,
  onReset,
  onAvatarUpload,
}: ProfileSectionProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
      <p className="text-gray-600 mb-6">Manage your personal information</p>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        {/* Avatar Upload */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-900 mb-2">
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
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-full bg-teal-600 flex items-center justify-center text-white text-4xl font-bold">
                  {userInitial}
                </div>
              )}
            </div>
            <div>
              <label className="cursor-pointer inline-block px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={onAvatarUpload}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG or WEBP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                First name
              </label>
              <input
                type="text"
                value={profileData.first_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                style={{ color: 'white' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Last name
              </label>
              <input
                type="text"
                value={profileData.last_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                style={{ color: 'white' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
              style={{ color: 'white' }}
            />
            <p className="text-sm text-gray-500 mt-1">
              Your primary email for account notifications
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
              style={{ color: 'white' }}
            />
            <p className="text-sm text-gray-500 mt-1">
              Optional contact number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Bio
            </label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
              style={{ color: 'white' }}
              placeholder="Tell us about yourself..."
            />
            <p className="text-sm text-gray-500 mt-1">
              Brief description for your profile
            </p>
          </div>

          {/* Location Section */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your location helps us match you with nearby contractors.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                  style={{ color: 'white' }}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                    style={{ color: 'white' }}
                    placeholder="London"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={profileData.postcode}
                    onChange={(e) => setProfileData(prev => ({ ...prev, postcode: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-800"
                    style={{ color: 'white' }}
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
                      When you save, we&apos;ll automatically determine your precise coordinates
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
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={onReset}
            className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
