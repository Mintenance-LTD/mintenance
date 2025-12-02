'use client';

import React, { useState, FormEvent } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete';
import { getSkillIcon } from '@/lib/skills/skill-icon-mapping';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';

/**
 * Contractor data for profile editing
 */
interface ContractorData {
  id: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  city?: string;
  country?: string;
  phone?: string;
  company_name?: string;
  license_number?: string;
  is_available?: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  profile_image_url?: string;
  selected_skills?: string[];
}

/**
 * Data submitted when saving the profile
 */
interface ProfileSaveData {
  firstName: string;
  lastName: string;
  bio: string;
  city: string;
  country: string;
  phone: string;
  companyName: string;
  licenseNumber: string;
  isAvailable: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  profileImage?: File | null;
  profileImageUrl?: string;
  selectedSkills?: string[];
  skills?: Array<{ skill_name: string; skill_icon: string }>;
}

interface EditProfileModalProps {
  contractor: ContractorData | null;
  skills: Array<{ skill_name: string }>;
  onClose: () => void;
  onSave: (data: ProfileSaveData) => Promise<void>;
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
    companyName: contractor?.company_name || '',
    licenseNumber: contractor?.license_number || '',
    isAvailable: contractor?.is_available ?? true,
    latitude: contractor?.latitude || undefined,
    longitude: contractor?.longitude || undefined,
    address: contractor?.address || undefined,
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(contractor?.profile_image_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    skills?.map(s => s.skill_name) || []
  );
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'business' | 'skills'>('basic');

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

  // Predefined skill list (same as SkillsManagementModal)
  const availableSkills = [
    'General Contracting',
    'Kitchen Remodeling',
    'Bathroom Renovation',
    'Plumbing',
    'Electrical Work',
    'Carpentry',
    'Tiling',
    'Painting',
    'Flooring',
    'Roofing',
    'HVAC',
    'Landscaping',
    'Masonry',
    'Drywall',
    'Window Installation',
    'Door Installation',
    'Deck Building',
    'Fence Installation',
    'Concrete Work',
    'Insulation',
    'Siding',
    'Gutters',
    'General Maintenance',
    'Home Inspection',
    'Demolition',
  ].sort();

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      if (selectedSkills.length >= 15) {
        setError('Maximum 15 skills allowed');
        return;
      }
      setSelectedSkills([...selectedSkills, skill]);
      setError(null);
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
        skills: selectedSkills.map(skillName => ({
          skill_name: skillName,
          skill_icon: getSkillIcon(skillName),
        })),
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
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: theme.shadows.xl,
            display: 'flex',
            flexDirection: 'column',
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
            backgroundColor: theme.colors.surface,
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              Edit Profile
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: theme.spacing[2],
                borderRadius: theme.borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon name="x" size={20} color={theme.colors.textSecondary} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            borderBottom: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.surface,
            paddingLeft: theme.spacing[6],
            paddingRight: theme.spacing[6],
          }}>
            <div style={{
              display: 'flex',
              gap: theme.spacing[8],
            }}>
              {[
                { id: 'basic' as const, label: 'Basic Info' },
                { id: 'location' as const, label: 'Location & Contact' },
                { id: 'business' as const, label: 'Business Info' },
                { id: 'skills' as const, label: 'Skills' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: `${theme.spacing[4]} 0`,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary,
                    cursor: 'pointer',
                    borderBottom: activeTab === tab.id ? `3px solid ${theme.colors.primary}` : '3px solid transparent',
                    marginBottom: '-1px',
                    transition: 'color 0.2s',
                    letterSpacing: '0.015em',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.color = theme.colors.textPrimary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: theme.spacing[6], overflowY: 'auto', flex: 1 }}>
              {/* Error Message */}
              {error && (
                <div style={{
                  backgroundColor: '#FEE2E2',
                  color: theme.colors.error,
                  padding: theme.spacing[4],
                  borderRadius: theme.borderRadius.lg,
                  marginBottom: theme.spacing[6],
                  fontSize: theme.typography.fontSize.sm,
                  border: `1px solid ${theme.colors.error}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  <Icon name="alertCircle" size={18} color={theme.colors.error} />
                  {error}
                </div>
              )}

              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div>
                  {/* Profile Photo Upload */}
                  <div style={{ 
                    marginBottom: theme.spacing[8], 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: theme.spacing[4],
                  }}>
                    <div style={{
                      width: '144px',
                      height: '144px',
                      borderRadius: '50%',
                      backgroundColor: theme.colors.backgroundSecondary,
                      backgroundImage: imagePreview ? `url(${imagePreview})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: `3px solid ${theme.colors.border}`,
                      fontSize: theme.typography.fontSize['4xl'],
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.textSecondary,
                      position: 'relative',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onClick={() => document.getElementById('profile-image-input')?.click()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = theme.shadows.md;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    >
                      {!imagePreview && (
                        <>
                          {formData.firstName?.[0] || 'U'}{formData.lastName?.[0] || ''}
                        </>
                      )}
                      {imagePreview && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0';
                        }}
                        >
                          <Icon name="camera" size={32} color="white" />
                        </div>
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
                        padding: `${theme.spacing[2]} ${theme.spacing[5]}`,
                        backgroundColor: theme.colors.primary,
                        border: 'none',
                        borderRadius: theme.borderRadius.lg,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.primary;
                      }}
                    >
                      {imagePreview ? 'Change Photo' : 'Upload Photo'}
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
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
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
                          backgroundColor: theme.colors.white,
                          color: theme.colors.textPrimary,
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border;
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
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
                          backgroundColor: theme.colors.white,
                          color: theme.colors.textPrimary,
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border;
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
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[2],
                    }}>
                      Bio / Description
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={5}
                      maxLength={500}
                      style={{
                        width: '100%',
                        padding: theme.spacing[3],
                        fontSize: theme.typography.fontSize.base,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.white,
                        color: theme.colors.textPrimary,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'border-color 0.2s',
                        lineHeight: '1.6',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border;
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

                  {/* Availability Toggle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: theme.spacing[5],
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    <div>
                      <label style={{
                        fontSize: theme.typography.fontSize.base,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
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
              )}

              {/* Location & Contact Tab */}
              {activeTab === 'location' && (
                <div>
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
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                        marginBottom: theme.spacing[2],
                      }}>
                        City / Address
                      </label>
                      <PlacesAutocomplete
                        value={formData.city}
                        onChange={(value) => setFormData({ ...formData, city: value })}
                        onPlaceSelect={(place) => {
                          setFormData({
                            ...formData,
                            city: place.city,
                            country: place.country,
                            address: place.address,
                            latitude: place.latitude,
                            longitude: place.longitude,
                          });
                        }}
                        placeholder="London or enter your address"
                        style={{
                          width: '100%',
                          padding: theme.spacing[3],
                          fontSize: theme.typography.fontSize.base,
                          borderRadius: theme.borderRadius.md,
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.white,
                          color: theme.colors.textPrimary,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
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
                          backgroundColor: theme.colors.white,
                          color: theme.colors.textPrimary,
                          cursor: 'pointer',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border;
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
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
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
                        backgroundColor: theme.colors.white,
                        color: theme.colors.textPrimary,
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border;
                      }}
                      placeholder="+44 7700 900000"
                    />
                  </div>
                </div>
              )}

              {/* Business Info Tab */}
              {activeTab === 'business' && (
                <div>
                  {/* Company Name */}
                  <div style={{ marginBottom: theme.spacing[6] }}>
                    <label style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[2],
                    }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: theme.spacing[3],
                        fontSize: theme.typography.fontSize.base,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.white,
                        color: theme.colors.textPrimary,
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border;
                      }}
                      placeholder="ABC Plumbing Ltd"
                    />
                    <p style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing[2],
                      margin: 0,
                    }}>
                      Your company name helps build trust with homeowners
                    </p>
                  </div>

                  {/* License Number */}
                  <div style={{ marginBottom: theme.spacing[6] }}>
                    <label style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[2],
                    }}>
                      License Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                      style={{
                        width: '100%',
                        padding: theme.spacing[3],
                        fontSize: theme.typography.fontSize.base,
                        borderRadius: theme.borderRadius.md,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.white,
                        color: theme.colors.textPrimary,
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.colors.border;
                      }}
                      placeholder="LIC-12345-UK"
                    />
                    <p style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing[2],
                      margin: 0,
                    }}>
                      Your license number will be verified by our admin team. Once verified, you'll receive a verification badge.
                    </p>
                  </div>
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <div>
                  {/* Skills & Professions */}
                  <div style={{ marginBottom: theme.spacing[6] }}>
                    <label style={{
                      display: 'block',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[2],
                    }}>
                      Skills & Professions ({selectedSkills.length}/15)
                    </label>
                    <p style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      margin: `0 0 ${theme.spacing[4]} 0`,
                      lineHeight: '1.6',
                    }}>
                      Select skills that match your expertise. Jobs requiring these skills will appear in your "Jobs Near You" feed.
                    </p>
                    
                    {/* Selected Skills Chips */}
                    {selectedSkills.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: theme.spacing[2],
                        marginBottom: theme.spacing[4],
                      }}>
                        {selectedSkills.map((skill) => (
                          <div
                            key={skill}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing[1],
                              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                              backgroundColor: `${theme.colors.primary}15`,
                              color: theme.colors.primary,
                              borderRadius: theme.borderRadius.full,
                              fontSize: theme.typography.fontSize.sm,
                              fontWeight: theme.typography.fontWeight.semibold,
                              border: `1px solid ${theme.colors.primary}30`,
                            }}
                          >
                            <Icon name={getSkillIcon(skill)} size={16} color={theme.colors.primary} />
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleSkill(skill)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                borderRadius: theme.borderRadius.full,
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                marginLeft: theme.spacing[1],
                                transition: 'background-color 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = `${theme.colors.primary}20`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Icon name="x" size={14} color={theme.colors.primary} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Skill Selection Dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setShowSkillDropdown(!showSkillDropdown)}
                        disabled={selectedSkills.length >= 15}
                        style={{
                          width: '100%',
                          padding: theme.spacing[3],
                          fontSize: theme.typography.fontSize.base,
                          borderRadius: theme.borderRadius.md,
                          border: `1px solid ${theme.colors.border}`,
                          backgroundColor: theme.colors.white,
                          color: theme.colors.textPrimary,
                          cursor: selectedSkills.length >= 15 ? 'not-allowed' : 'pointer',
                          opacity: selectedSkills.length >= 15 ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                          if (selectedSkills.length < 15) {
                            e.currentTarget.style.borderColor = theme.colors.primary;
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = theme.colors.border;
                        }}
                      >
                        <span>{selectedSkills.length >= 15 ? 'Maximum skills reached' : 'Add Skill'}</span>
                        <Icon name="chevronDown" size={16} color={theme.colors.textSecondary} />
                      </button>

                      {showSkillDropdown && (
                        <>
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: theme.spacing[1],
                              backgroundColor: theme.colors.surface,
                              border: `1px solid ${theme.colors.border}`,
                              borderRadius: theme.borderRadius.lg,
                              boxShadow: theme.shadows.lg,
                              maxHeight: '300px',
                              overflowY: 'auto',
                              zIndex: 1000,
                              padding: theme.spacing[2],
                            }}
                          >
                            {availableSkills
                              .filter(skill => !selectedSkills.includes(skill))
                              .map((skill) => (
                                <button
                                  key={skill}
                                  type="button"
                                  onClick={() => {
                                    handleToggleSkill(skill);
                                    setShowSkillDropdown(false);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                                    textAlign: 'left',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: theme.borderRadius.md,
                                    fontSize: theme.typography.fontSize.sm,
                                    color: theme.colors.textPrimary,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: theme.spacing[2],
                                    transition: 'background-color 0.2s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <Icon name={getSkillIcon(skill)} size={16} color={theme.colors.textSecondary} />
                                  <span>{skill}</span>
                                </button>
                              ))}
                            {availableSkills.filter(skill => !selectedSkills.includes(skill)).length === 0 && (
                              <div style={{
                                padding: theme.spacing[4],
                                textAlign: 'center',
                                color: theme.colors.textSecondary,
                                fontSize: theme.typography.fontSize.sm,
                              }}>
                                All available skills selected
                              </div>
                            )}
                          </div>
                          {/* Backdrop to close dropdown */}
                          <div
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 999,
                            }}
                            onClick={() => setShowSkillDropdown(false)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Account Section */}
            <div style={{
              padding: theme.spacing[6],
              borderTop: `1px solid ${theme.colors.border}`,
              borderBottom: `1px solid ${theme.colors.border}`,
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[3],
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}>
                  Danger Zone
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  lineHeight: 1.6,
                }}>
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={loading}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                    backgroundColor: 'transparent',
                    border: `1px solid #EF4444`,
                    borderRadius: theme.borderRadius.lg,
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: '#EF4444',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    width: 'fit-content',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon name="trash" size={16} color="#EF4444" />
                  Delete Account
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
              backgroundColor: theme.colors.surface,
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
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = theme.colors.border;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
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
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = theme.colors.primaryLight;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = loading ? theme.colors.primaryLight : theme.colors.primary;
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && contractor?.id && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          userId={contractor.id}
        />
      )}
    </>
  );
}


