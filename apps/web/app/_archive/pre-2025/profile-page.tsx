'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { LoadingSpinner, ErrorView } from '@/components/ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MapPin } from 'lucide-react';
import { ProfilePictureSection } from './components/ProfilePictureSection';
import { validateImageFile, readImageFile, saveProfile } from './lib/utils';
import type { ProfileFormData } from './lib/types';
import Link from 'next/link';
import { HomeownerLayoutShell } from '@/app/dashboard/components/HomeownerLayoutShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProfileFormField } from './components/ProfileFormField';
import { LocationInput } from './components/LocationInput';
import { DangerZone } from './components/DangerZone';
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal';
import { useAddressSearch, useGeolocation } from './lib/hooks';
import { theme } from '@/lib/theme';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

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
        {/* Header - Navy Blue Command Center Style */}
        <div className="relative overflow-hidden bg-primary-900 p-8 -m-8 rounded-2xl mb-2 shadow-xl border border-primary-800">
          {/* Decorative Elements */}
          <div aria-hidden="true" className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div aria-hidden="true" className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-800 flex items-center justify-center shadow-inner border border-primary-700">
                <Icon name="user" size={28} color="white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                  Profile Settings
                </h1>
                <p className="text-base font-medium text-primary-200 leading-relaxed">
                  Manage your personal information and account security
                </p>
              </div>
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

        {/* Tabs Interface */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger
              value="personal"
              className="data-[state=active]:bg-primary-900 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Personal Info
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-primary-900 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              Security & Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-0">
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
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing[4],
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

              {/* Edit Profile Button - Below form fields */}
              <div className="mt-6">
                {!isEditing ? (
                  <Button
                    variant="primary"
                    onClick={() => setIsEditing(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    fullWidth
                  >
                    <Icon name="edit" size={16} className="mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      fullWidth
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      fullWidth
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            {/* Danger Zone Card */}
            <DangerZone
              onDeleteClick={() => setShowDeleteModal(true)}
              disabled={isSaving}
            />
          </TabsContent>
        </Tabs>
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

