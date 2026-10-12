import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile } from '@mintenance/types';
import { logger } from '../utils/logger';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { me } from '../design-system/mint-editorial';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { mobileApiClient } from '../utils/mobileApiClient';
import { styles } from './ContractorCardEditorScreen/styles';
import { BusinessInfoSection } from './ContractorCardEditorScreen/BusinessInfoSection';
import {
  LogoSection,
  AvailabilitySection,
  PortfolioSection,
  ServiceAreaSection,
} from './ContractorCardEditorScreen/PortfolioSection';
import { PreviewModal } from './ContractorCardEditorScreen/PreviewModal';

// 2026-05-23 audit-21 P1: any uri that doesn't already point at our
// CDN / a public storage bucket is treated as a fresh device file
// that needs uploading on save. Covers expo-image-picker (file://,
// content://, ph://) and any other not-yet-uploaded local URI.
function isLocalPortfolioUri(uri: string): boolean {
  if (!uri) return false;
  return !/^https?:\/\//i.test(uri);
}

interface ContractorCardEditorScreenProps {
  navigation: NativeStackNavigationProp<
    ProfileStackParamList,
    'ContractorCardEditor'
  >;
}

export const ContractorCardEditorScreen: React.FC<
  ContractorCardEditorScreenProps
> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [profile, setProfile] = useState<Partial<ContractorProfile>>({
    companyName: '',
    bio: '',
    hourlyRate: 0,
    yearsExperience: 0,
    businessAddress: '',
    serviceRadius: 25,
    availability: 'this_week',
    specialties: [],
    portfolioImages: [],
    certifications: [],
  });

  // Discard-prompt — hydration sets state via the plain setter and
  // doesn't flip the dirty flag, so navigating right after the screen
  // loads is silent. User edits / image picks set the flag.
  const [hasEdits, setHasEdits] = useState(false);
  const allowExit = useUnsavedChanges(hasEdits);
  // Wrap the standard setter so any edit through child components
  // (BusinessInfoSection, AvailabilitySection, ServiceAreaSection)
  // flips the dirty flag without each child needing its own logic.
  const setProfileDirty: typeof setProfile = (next) => {
    setProfile(next);
    setHasEdits(true);
  };

  useEffect(() => {
    loadContractorProfile();
  }, []);

  const loadContractorProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const contractorProfile = await ContractorService.getContractorProfile(
        user.id
      );
      if (!contractorProfile) throw new Error('Could not load saved profile');
      if (contractorProfile) {
        let businessAddr = contractorProfile.business_address;

        setProfile({
          ...contractorProfile,
          companyName: contractorProfile.company_name ?? '',
          hourlyRate: contractorProfile.hourly_rate ?? 0,
          companyLogo: contractorProfile.company_logo,
          businessAddress: businessAddr || '',
          specialties: contractorProfile.specialties || [],
          portfolioImages: contractorProfile.portfolio_images || [],
          certifications: contractorProfile.certifications || [],
        });
      }
    } catch (error) {
      setLoadFailed(true);
      logger.error('Failed to load contractor profile:', error);
      Alert.alert('Unable to load profile', 'Please retry before editing.', [
        { text: 'Go back', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async (type: 'logo' | 'portfolio') => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [4, 3],
        quality: 0.8,
        allowsMultipleSelection: type === 'portfolio',
      });

      if (!result.canceled) {
        if (type === 'logo') {
          setProfile((prev) => ({
            ...prev,
            companyLogo: result.assets[0]?.uri ?? '',
          }));
        } else {
          const newImages = result.assets.map((asset) => asset.uri);
          setProfile((prev) => ({
            ...prev,
            portfolioImages: [
              ...(prev.portfolioImages || []),
              ...newImages,
            ].slice(0, 8),
          }));
        }
        setHasEdits(true);
      }
    } catch (error) {
      logger.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removePortfolioImage = (imageUri: string) => {
    if (!isLocalPortfolioUri(imageUri)) {
      Alert.alert(
        'Remove public photo?',
        'This removes the photo from your web and mobile public profile.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await mobileApiClient.delete(
                  '/api/contractor/portfolio-image',
                  { body: JSON.stringify({ url: imageUri }) }
                );
                setProfile((previous) => ({
                  ...previous,
                  portfolioImages: previous.portfolioImages?.filter(
                    (image) => image !== imageUri
                  ),
                }));
              } catch {
                Alert.alert(
                  'Not removed',
                  'Could not remove this photo. Please retry.'
                );
              }
            },
          },
        ]
      );
      return;
    }
    setProfile((prev) => ({
      ...prev,
      portfolioImages:
        prev.portfolioImages?.filter((img) => img !== imageUri) || [],
    }));
    setHasEdits(true);
  };

  const saveProfile = async () => {
    if (!user || loadFailed) return;

    try {
      setSaving(true);

      // Persist images before reporting a successful profile save.
      if (profile.companyLogo && isLocalPortfolioUri(profile.companyLogo)) {
        const logo = await ContractorService.uploadContractorImage(
          user.id,
          profile.companyLogo,
          'logo',
          {
            firstName: user.first_name ?? user.firstName ?? '',
            lastName: user.last_name ?? user.lastName ?? '',
            isAvailable: profile.availability !== 'busy',
          }
        );
        setProfile((previous) => ({ ...previous, companyLogo: logo }));
      }
      const existing = profile.portfolioImages ?? [];
      const localUris = existing.filter((u) => isLocalPortfolioUri(u));
      if (localUris.length > 0) {
        for (const uri of localUris) {
          try {
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
            const formData = new FormData();
            formData.append('photos', {
              uri,
              name: fileName,
              type: 'image/jpeg',
            } as unknown as Blob);
            formData.append('title', 'Portfolio update');
            formData.append('category', 'general');
            const uploaded = await mobileApiClient.postFormData<{
              data: { media_urls: string[] };
            }>('/api/contractor/upload-photos', formData);
            setProfile((previous) => ({
              ...previous,
              portfolioImages: previous.portfolioImages?.flatMap((value) =>
                value === uri ? uploaded.data.media_urls : [value]
              ),
            }));
          } catch (uploadErr) {
            logger.warn('Portfolio image upload failed', {
              uri,
              error:
                uploadErr instanceof Error
                  ? uploadErr.message
                  : String(uploadErr),
            });
            throw new Error(
              'A portfolio photo could not be saved. Your changes have not all been saved.'
            );
          }
        }
      }

      const availabilityIsAvailable = profile.availability !== 'busy';
      await ContractorService.updateContractorProfile(user.id, {
        ...profile,
        firstName: user.first_name ?? user.firstName ?? '',
        lastName: user.last_name ?? user.lastName ?? '',
        isAvailable: availabilityIsAvailable,
      });
      await mobileApiClient.patch('/api/contractor/business-profile', {
        companyName: profile.companyName ?? '',
        businessAddress: profile.businessAddress ?? '',
      });
      setHasEdits(false);
      Alert.alert('Success', 'Your discovery card has been updated!');
      allowExit();
      navigation.goBack();
    } catch (error) {
      logger.error('Failed to save contractor profile:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to save profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed)
    return (
      <View style={styles.container}>
        <Text>Could not load saved profile details.</Text>
        <TouchableOpacity
          onPress={() => {
            setLoadFailed(false);
            setLoading(true);
            void loadContractorProfile();
          }}
        >
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );

  if (loading) {
    return <LoadingSpinner message='Loading your profile...' />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Discovery Card</Text>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => setPreviewVisible(true)}
          accessibilityRole='button'
          accessibilityLabel='Preview card'
        >
          <Ionicons name='eye' size={22} color={me.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LogoSection
          profile={profile}
          onPickLogo={() => handleImagePicker('logo')}
        />
        <BusinessInfoSection
          profile={profile}
          setProfile={setProfileDirty}
          user={user}
        />
        <AvailabilitySection profile={profile} setProfile={setProfileDirty} />
        <PortfolioSection
          profile={profile}
          onAddPortfolio={() => handleImagePicker('portfolio')}
          onRemoveImage={removePortfolioImage}
        />
        <ServiceAreaSection profile={profile} setProfile={setProfileDirty} />

        <View style={styles.saveSection}>
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.5 }]}
            onPress={saveProfile}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Discovery Card'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        profile={profile}
        topInset={insets.top}
      />
    </View>
  );
};
