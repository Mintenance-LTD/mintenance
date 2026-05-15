import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
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

/**
 * Profile settings section — Direction A · Mint Editorial. Renders on
 * the `--me-*` tokens + `.card` / `.field` / `.btn` primitives.
 */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--me-ink-2)',
  marginBottom: 6,
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--me-ink-3)',
  margin: '6px 0 0',
};

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
    <div>
      <h1 className='t-h1' style={{ marginBottom: 4 }}>
        Profile
      </h1>
      <p className='t-body' style={{ margin: '0 0 20px' }}>
        Manage your personal information
      </p>

      <div className='card' style={{ padding: 28 }}>
        {/* Avatar Upload */}
        <div style={{ marginBottom: 28 }}>
          <span style={labelStyle}>Profile photo</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {profileData.profile_image_url ? (
              <Image
                src={profileData.profile_image_url}
                alt='Profile'
                width={96}
                height={96}
                style={{ borderRadius: 9999, objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 9999,
                  background: 'var(--me-brand)',
                  color: 'var(--me-on-brand)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 34,
                  fontWeight: 600,
                  fontFamily: 'var(--me-font-display)',
                }}
              >
                {userInitial}
              </div>
            )}
            <div>
              <label
                className='btn btn-secondary'
                style={{ cursor: 'pointer' }}
              >
                Change photo
                <input
                  type='file'
                  accept='image/*'
                  onChange={onAvatarUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={hintStyle}>JPG, PNG or WEBP. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div>
              <label htmlFor='profile-firstName' style={labelStyle}>
                First name
              </label>
              <input
                id='profile-firstName'
                type='text'
                className='field'
                value={profileData.first_name}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor='profile-lastName' style={labelStyle}>
                Last name
              </label>
              <input
                id='profile-lastName'
                type='text'
                className='field'
                value={profileData.last_name}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label htmlFor='profile-email' style={labelStyle}>
              Email
            </label>
            <input
              id='profile-email'
              type='email'
              className='field'
              value={profileData.email}
              readOnly
              disabled
              style={{
                background: 'var(--me-bg-2)',
                color: 'var(--me-ink-3)',
                cursor: 'not-allowed',
              }}
            />
            <p style={hintStyle}>
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          <div>
            <label htmlFor='profile-phone' style={labelStyle}>
              Phone
            </label>
            <input
              id='profile-phone'
              type='tel'
              className='field'
              value={profileData.phone}
              onChange={(e) =>
                setProfileData((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <p style={hintStyle}>Optional contact number</p>
          </div>

          <div>
            <label htmlFor='profile-bio' style={labelStyle}>
              Bio
            </label>
            <textarea
              id='profile-bio'
              className='field'
              value={profileData.bio}
              onChange={(e) =>
                setProfileData((prev) => ({ ...prev, bio: e.target.value }))
              }
              rows={4}
              placeholder='Tell us about yourself...'
            />
            <p style={hintStyle}>Brief description for your profile</p>
          </div>

          {/* Location Section */}
          <div
            style={{
              borderTop: '1px solid var(--me-line-2)',
              paddingTop: 22,
              marginTop: 4,
            }}
          >
            <h3 className='t-h3' style={{ marginBottom: 4 }}>
              Location
            </h3>
            <p className='t-body' style={{ margin: '0 0 18px' }}>
              Your location helps us match you with nearby jobs and homeowners.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label htmlFor='profile-address' style={labelStyle}>
                  Address
                </label>
                <input
                  id='profile-address'
                  type='text'
                  className='field'
                  value={profileData.address}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder='123 Main Street'
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <label htmlFor='profile-city' style={labelStyle}>
                    City
                  </label>
                  <input
                    id='profile-city'
                    type='text'
                    className='field'
                    value={profileData.city}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    placeholder='London'
                  />
                </div>
                <div>
                  <label htmlFor='profile-postcode' style={labelStyle}>
                    Postcode
                  </label>
                  <input
                    id='profile-postcode'
                    type='text'
                    className='field'
                    value={profileData.postcode}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        postcode: e.target.value.toUpperCase(),
                      }))
                    }
                    autoCapitalize='characters'
                    spellCheck={false}
                    placeholder='SW1A 1AA'
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: 'var(--me-brand-soft)',
                  borderRadius: 'var(--me-radius-input)',
                  padding: 14,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 9999,
                    background: 'var(--me-brand)',
                    color: 'var(--me-on-brand)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Check className='w-3 h-3' />
                </span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--me-brand-2)',
                    }}
                  >
                    Location will be geocoded automatically
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 12,
                      color: 'var(--me-ink-2)',
                    }}
                  >
                    When you save, we&apos;ll automatically determine your
                    precise coordinates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 28,
            paddingTop: 22,
            borderTop: '1px solid var(--me-line-2)',
          }}
        >
          <button
            onClick={onSave}
            disabled={isSaving}
            className='btn btn-primary btn-lg'
            style={{ opacity: isSaving ? 0.6 : 1 }}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={onReset} className='btn btn-ghost btn-lg'>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
