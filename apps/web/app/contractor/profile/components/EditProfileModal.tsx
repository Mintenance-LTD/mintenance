'use client';

import React, { useState, FormEvent } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { PlacesAutocomplete } from '@/components/ui/PlacesAutocomplete';
import { getSkillIcon } from '@/lib/skills/skill-icon-mapping';

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
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                    }}
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

              {/* Skills & Professions */}
              <div style={{ marginBottom: theme.spacing[6] }}>
                <label style={{
                  display: 'block',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing[2],
                }}>
                  Skills & Professions ({selectedSkills.length}/15)
                </label>
                <p style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary,
                  margin: `0 0 ${theme.spacing[3]} 0`,
                }}>
                  Select skills that match your expertise. Jobs requiring these skills will appear in your "Jobs Near You" feed.
                </p>
                
                {/* Selected Skills Chips */}
                {selectedSkills.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[3],
                  }}>
                    {selectedSkills.map((skill) => (
                      <div
                        key={skill}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing[1],
                          padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                          backgroundColor: theme.colors.primary,
                          color: 'white',
                          borderRadius: theme.borderRadius.full,
                          fontSize: theme.typography.fontSize.sm,
                          fontWeight: theme.typography.fontWeight.medium,
                        }}
                      >
                        <Icon name={getSkillIcon(skill)} size={14} color="white" />
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleSkill(skill)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: theme.borderRadius.full,
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            marginLeft: theme.spacing[1],
                          }}
                        >
                          <Icon name="x" size={12} color="white" />
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
                      backgroundColor: theme.colors.backgroundSecondary,
                      color: theme.colors.text,
                      cursor: selectedSkills.length >= 15 ? 'not-allowed' : 'pointer',
                      opacity: selectedSkills.length >= 15 ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
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
                                color: theme.colors.text,
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


