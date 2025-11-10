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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';
import { ProfilePictureSection } from './components/ProfilePictureSection';
import { ProfileFormField } from './components/ProfileFormField';
import { DangerZone } from './components/DangerZone';
import { LocationInput } from './components/LocationInput';
import { useAddressSearch, useGeolocation } from './lib/hooks';
import { validateImageFile, readImageFile, saveProfile } from './lib/utils';
import type { ProfileFormData } from './lib/types';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: loadingUser, error: currentUserError } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
  });
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Use custom hooks for location functionality
  const {
    locationSuggestions,
    showSuggestions,
    setShowSuggestions,
  } = useAddressSearch(formData.location);

  const {
    isDetectingLocation,
    geolocationAlert,
    setGeolocationAlert,
    detectLocation,
  } = useGeolocation();

  useEffect(() => {
    if (!loadingUser && user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: (user as { location?: string }).location || '',
      });
      setProfileImage((user as { profile_image_url?: string }).profile_image_url || null);
    }
  }, [user, loadingUser]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, loadingUser, router]);

  const handleLocationSelect = (address: string) => {
    setFormData(prev => ({ ...prev, location: address }));
    setShowSuggestions(false);
  };

  const handleDetectLocation = async () => {
    try {
      const location = await detectLocation();
      setFormData(prev => ({ ...prev, location }));
      setShowSuggestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not determine your address. Please enter it manually.');
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    try {
      setProfileImageFile(file);
      const imageUrl = await readImageFile(file);
      setProfileImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read image file');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    const result = await saveProfile(formData, profileImageFile, profileImage);

    if (result.success) {
      setIsEditing(false);
      setProfileImageFile(null);
      // Small delay to ensure save completes before reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      setError(result.error || 'Failed to save profile');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    // Reset form data
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: (user as { location?: string }).location || '',
      });
      setProfileImage((user as { profile_image_url?: string }).profile_image_url || null);
      setProfileImageFile(null);
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.backgroundSecondary }}>
        <div style={{
          backgroundColor: theme.colors.white,
          padding: theme.spacing[8],
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${theme.colors.border}`,
          textAlign: 'center',
          maxWidth: '500px',
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
            Access Denied
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[6],
          }}>
            You must be logged in to access your profile.
          </p>
          <Link href="/login?redirect=/profile" style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
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
                onClick={handleCancel}
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
          borderRadius: theme.borderRadius['2xl'],
          padding: theme.spacing[8],
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          {/* Profile Picture Section */}
          <ProfilePictureSection
            profileImage={profileImage}
            initials={initials}
            isEditing={isEditing}
            onImageSelect={handleImageSelect}
          />

          {/* Profile Information */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: theme.spacing[6],
          }}>
            <ProfileFormField
              label="First Name"
              value={formData.firstName}
              isEditing={isEditing}
              displayValue={user.first_name || undefined}
              onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
            />

            <ProfileFormField
              label="Last Name"
              value={formData.lastName}
              isEditing={isEditing}
              displayValue={user.last_name || undefined}
              onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
            />

            <ProfileFormField
              label="Email Address"
              value={formData.email}
              isEditing={isEditing}
              displayValue={user.email}
              type="email"
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
              verified={user.email_verified}
            />

            <ProfileFormField
              label="Phone Number"
              value={formData.phone}
              isEditing={isEditing}
              displayValue={user.phone || undefined}
              type="tel"
              placeholder="+44 123 456 7890"
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
            />

            <ProfileFormField
              label="Location"
              value={formData.location}
              isEditing={isEditing}
              displayValue={(user as { location?: string }).location || undefined}
              fullWidth
              icon="mapPin"
            >
              {isEditing ? (
                <LocationInput
                  value={formData.location}
                  onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                  onSelect={handleLocationSelect}
                  suggestions={locationSuggestions}
                  showSuggestions={showSuggestions}
                  onFocus={() => {
                    if (locationSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  onDetectLocation={handleDetectLocation}
                  isDetectingLocation={isDetectingLocation}
                />
              ) : (
                <div style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                  padding: `${theme.spacing[2]} 0`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  <Icon name="mapPin" size={16} color={theme.colors.textSecondary} />
                  {(user as { location?: string }).location || 'Not set'}
                </div>
              )}
            </ProfileFormField>
          </div>
        </div>

        {/* Danger Zone Card */}
        <DangerZone
          onDeleteClick={() => setShowDeleteModal(true)}
          disabled={isSaving}
        />
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

