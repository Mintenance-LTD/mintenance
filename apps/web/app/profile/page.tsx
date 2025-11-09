'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; place_id: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [geolocationAlert, setGeolocationAlert] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    if (!loadingUser && user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: (user as any).location || '',
      });
      setProfileImage((user as any).profile_image_url || null);
    }
  }, [user, loadingUser]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, loadingUser, router]);

  // Debounced address search for autocomplete
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.location.trim().length >= 3) {
        searchAddresses(formData.location);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.location]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) return;

    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch (error) {
      console.error('Error searching addresses:', error);
    }
  };

  const handleLocationSelect = (address: string) => {
    setFormData(prev => ({ ...prev, location: address }));
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setGeolocationAlert({
        open: true,
        message: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setIsDetectingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `/api/geocoding/reverse?lat=${latitude}&lon=${longitude}`
          );

          if (!response.ok) {
            throw new Error('Failed to get address');
          }

          const data = await response.json();
          const address = data.address;
          let formattedLocation = '';

          if (address.road) formattedLocation += address.road;
          if (address.house_number) formattedLocation = address.house_number + ' ' + formattedLocation;
          if (address.suburb) formattedLocation += ', ' + address.suburb;
          if (address.city || address.town || address.village) {
            formattedLocation += ', ' + (address.city || address.town || address.village);
          }
          if (address.postcode) formattedLocation += ', ' + address.postcode;

          const finalLocation = formattedLocation.trim() || data.display_name;
          setFormData(prev => ({ ...prev, location: finalLocation }));
          setShowSuggestions(false);
          setLocationSuggestions([]);
        } catch (error) {
          console.error('Error getting address:', error);
          setError('Could not determine your address. Please enter it manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        let message = 'Unable to retrieve your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'Please enable location permissions in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            message += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message += 'Location request timed out.';
            break;
          default:
            message += 'An unknown error occurred.';
        }
        setError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      // If profile image changed, upload it first
      let imageUrl = profileImage;
      if (profileImageFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('profileImage', profileImageFile);
        formDataUpload.append('firstName', formData.firstName);
        formDataUpload.append('lastName', formData.lastName);
        formDataUpload.append('email', formData.email);
        formDataUpload.append('phone', formData.phone);
        formDataUpload.append('location', formData.location);

        const uploadResponse = await fetch('/api/user/update-profile', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Failed to update profile');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.profileImageUrl || imageUrl;
        
        setIsEditing(false);
        setProfileImageFile(null);
        // Small delay to ensure save completes before reload
        setTimeout(() => {
          window.location.reload();
        }, 100);
        return;
      }

      // Update profile data without image
      const updateResponse = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setIsEditing(false);
      setProfileImageFile(null);
      // Small delay to ensure save completes before reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingUser) {
    return <LoadingSpinner fullScreen message="Loading profile..." />;
  }

  if (currentUserError) {
    return (
      <ErrorView
        title="Unable to load profile"
        message="Please refresh the page or try signing in again."
        onRetry={() => window.location.reload()}
        retryLabel="Refresh Page"
        variant="fullscreen"
      />
    );
  }

  if (!user) {
    return null;
  }

  const userDisplayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.email;

  const initials = userDisplayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <HomeownerLayoutShell
      currentPath="/profile"
      userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user.email}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing[2],
        }}>
          <div>
            <h1 style={{
              margin: 0,
              marginBottom: theme.spacing[2],
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
            }}>
              Profile
            </h1>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Manage your profile information and preferences
            </p>
          </div>
          {!isEditing ? (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
            >
              <Icon name="edit" size={16} />
              Edit Profile
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: theme.spacing[2] }}>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setError('');
                  // Reset form data
                  if (user) {
                  setFormData({
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    location: (user as any).location || '',
                  });
                  setProfileImage((user as any).profile_image_url || null);
                    setProfileImageFile(null);
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          {/* Delete Account Section */}
          <div style={{
            marginTop: theme.spacing[8],
            padding: theme.spacing[6],
            borderTop: `1px solid ${theme.colors.border}`,
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
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                disabled={isSaving}
                leftIcon={<Icon name="trash" size={16} />}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Card */}
        <div style={{
          backgroundColor: theme.colors.white,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
        }}>
          {/* Profile Picture Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing[4],
            marginBottom: theme.spacing[6],
            paddingBottom: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: theme.typography.fontWeight.bold,
                fontSize: theme.typography.fontSize['2xl'],
                overflow: 'hidden',
                border: `4px solid ${theme.colors.border}`,
              }}>
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              {isEditing && (
                <label
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '36px',
                    height: '36px',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.primary,
                    border: `3px solid white`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1E293B';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  <Icon name="camera" size={18} color="white" />
                </label>
              )}
            </div>
            {isEditing && (
              <p style={{
                margin: 0,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                textAlign: 'center',
              }}>
                Click the camera icon to change your profile picture
              </p>
            )}
          </div>

          {/* Profile Information */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: theme.spacing[4],
          }}>
            {/* First Name */}
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
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundSecondary,
                    outline: 'none',
                  }}
                />
              ) : (
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                }}>
                  {user.first_name || 'Not set'}
                </div>
              )}
            </div>

            {/* Last Name */}
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
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundSecondary,
                    outline: 'none',
                  }}
                />
              ) : (
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                }}>
                  {user.last_name || 'Not set'}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}>
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundSecondary,
                    outline: 'none',
                  }}
                />
              ) : (
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  {user.email}
                  {user.email_verified && (
                    <span style={{
                      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: '#10B98115',
                      color: '#10B981',
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}>
                      ✓ Verified
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}>
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+44 123 456 7890"
                  style={{
                    width: '100%',
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.backgroundSecondary,
                    outline: 'none',
                  }}
                />
              ) : (
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                }}>
                  {user.phone || 'Not set'}
                </div>
              )}
            </div>

            {/* Location */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[2],
              }}>
                Location
              </label>
              {isEditing ? (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        onFocus={() => {
                          if (locationSuggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        placeholder="Enter your address"
                        style={{
                          width: '100%',
                          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                          borderRadius: theme.borderRadius.lg,
                          border: `1px solid ${theme.colors.border}`,
                          fontSize: theme.typography.fontSize.base,
                          color: theme.colors.textPrimary,
                          backgroundColor: theme.colors.backgroundSecondary,
                          outline: 'none',
                        }}
                      />
                      {/* Autocomplete Dropdown */}
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: theme.spacing[1],
                          backgroundColor: theme.colors.white,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.borderRadius.lg,
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          zIndex: 1000,
                          maxHeight: '300px',
                          overflowY: 'auto',
                        }}>
                          {locationSuggestions.map((suggestion) => (
                            <div
                              key={suggestion.place_id}
                              onClick={() => handleLocationSelect(suggestion.display_name)}
                              onMouseDown={(e) => e.preventDefault()}
                              style={{
                                padding: theme.spacing[3],
                                cursor: 'pointer',
                                fontSize: theme.typography.fontSize.sm,
                                color: theme.colors.textPrimary,
                                borderBottom: `1px solid ${theme.colors.border}`,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: theme.spacing[2],
                              }}>
                                <Icon name="mapPin" size={16} color={theme.colors.textSecondary} style={{ marginTop: '2px' }} />
                                <span>{suggestion.display_name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                      leftIcon={<Icon name="mapPin" size={16} />}
                    >
                      {isDetectingLocation ? 'Detecting...' : 'Use My Location'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
                  {(user as any).location || 'Not set'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && user && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          userId={user.id}
        />
      )}

      {/* Geolocation Alert Dialog */}
      <AlertDialog open={geolocationAlert.open} onOpenChange={(open: boolean) => setGeolocationAlert({ ...geolocationAlert, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Geolocation Not Supported</AlertDialogTitle>
            <AlertDialogDescription>{geolocationAlert.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGeolocationAlert({ open: false, message: '' })}>
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </HomeownerLayoutShell>
  );
}

