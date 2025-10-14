'use client';

import React, { useState, FormEvent } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface EditProfileModalProps {
  contractor: any;
  skills: Array<{ skill_name: string }>;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

/**
 * EditProfileModal Component
 * 
 * Modal form for editing contractor profile information.
 * Following Single Responsibility Principle - only handles profile editing.
 * 
 * @filesize Target: <400 lines
 */
export function EditProfileModal({ contractor, skills, onClose, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    firstName: contractor?.first_name || '',
    lastName: contractor?.last_name || '',
    bio: contractor?.bio || '',
    city: contractor?.city || '',
    country: contractor?.country || 'UK',
    phone: contractor?.phone || '',
    isAvailable: contractor?.is_available ?? true,
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(contractor?.profile_image_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }

      setProfileImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Prepare data for submission
      const updateData = {
        ...formData,
        profileImage,
      };

      await onSave(updateData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[4],
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.xl,
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: theme.shadows.xl,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            padding: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
            }}>
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: theme.typography.fontSize['2xl'],
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: theme.spacing[2],
              }}
            >
              <Icon name="x" size={16} color={theme.colors.textSecondary} />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit}>
            <div style={{ padding: theme.spacing[6] }}>
              {/* Error Message */}
              {error && (
                <div style={{
                  backgroundColor: theme.colors.errorLight,
                  color: theme.colors.error,
                  padding: theme.spacing[4],
                  borderRadius: theme.borderRadius.lg,
                  marginBottom: theme.spacing[6],
                  fontSize: theme.typography.fontSize.sm,
                }}>
                  {error}
                </div>
              )}

              {/* Profile Photo Upload */}
              <div style={{ marginBottom: theme.spacing[6], textAlign: 'center' }}>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[3],
                }}>
                  Profile Photo
                </label>
                
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.backgroundSecondary,
                  backgroundImage: imagePreview ? `url(${imagePreview})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: theme.spacing[3],
                  cursor: 'pointer',
                  border: `2px dashed ${theme.colors.border}`,
                  fontSize: theme.typography.fontSize['4xl'],
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.textSecondary,
                }}
                onClick={() => document.getElementById('profile-image-input')?.click()}
                >
                  {!imagePreview && (
                    <>
                      {formData.firstName?.[0]}{formData.lastName?.[0]}
                    </>
                  )}
                </div>

                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => document.getElementById('profile-image-input')?.click()}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.text,
                    cursor: 'pointer',
                  }}
                >
                  Upload Photo
                </button>
              </div>

              {/* Name Fields */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: theme.spacing[4],
                marginBottom: theme.spacing[6],
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.text,
                    marginBottom: theme.spacing[2],
                  }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: theme.spacing[3],
                      fontSize: theme.typography.fontSize.base,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.text,
                    marginBottom: theme.spacing[2],
                  }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: theme.spacing[3],
                      fontSize: theme.typography.fontSize.base,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                    }}
                    required
                  />
                </div>
              </div>

              {/* Bio */}
              <div style={{ marginBottom: theme.spacing[6] }}>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[2],
                }}>
                  Bio / Description
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: theme.spacing[3],
                    fontSize: theme.typography.fontSize.base,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    color: theme.colors.text,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  placeholder="Tell homeowners about your experience, specialties, and what makes you unique..."
                />
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  marginTop: theme.spacing[2],
                  textAlign: 'right',
                }}>
                  {formData.bio.length}/500 characters
                </div>
              </div>

              {/* Location Fields */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: theme.spacing[4],
                marginBottom: theme.spacing[6],
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.text,
                    marginBottom: theme.spacing[2],
                  }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: theme.spacing[3],
                      fontSize: theme.typography.fontSize.base,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                    }}
                    placeholder="London"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.text,
                    marginBottom: theme.spacing[2],
                  }}>
                    Country
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    style={{
                      width: '100%',
                      padding: theme.spacing[3],
                      fontSize: theme.typography.fontSize.base,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="UK">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div style={{ marginBottom: theme.spacing[6] }}>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[2],
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: theme.spacing[3],
                    fontSize: theme.typography.fontSize.base,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    color: theme.colors.text,
                  }}
                  placeholder="+44 7700 900000"
                />
              </div>

              {/* Availability Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: theme.spacing[4],
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: theme.borderRadius.lg,
                marginBottom: theme.spacing[6],
              }}>
                <div>
                  <label style={{
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.text,
                    display: 'block',
                    marginBottom: theme.spacing[1],
                  }}>
                    Available for New Projects
                  </label>
                  <p style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    margin: 0,
                  }}>
                    Show your profile to homeowners looking for contractors
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                  style={{
                    width: '60px',
                    height: '32px',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: formData.isAvailable ? theme.colors.success : theme.colors.border,
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    left: formData.isAvailable ? '32px' : '4px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    transition: 'left 0.2s',
                    boxShadow: theme.shadows.sm,
                  }} />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: theme.spacing[6],
              borderTop: `1px solid ${theme.colors.border}`,
              display: 'flex',
              gap: theme.spacing[4],
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                  backgroundColor: theme.colors.backgroundSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                  backgroundColor: loading ? theme.colors.primaryLight : theme.colors.primary,
                  border: 'none',
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}


