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
import { theme } from '../theme';
import { styles } from './ContractorCardEditorScreen/styles';
import { BusinessInfoSection } from './ContractorCardEditorScreen/BusinessInfoSection';
import {
  LogoSection,
  AvailabilitySection,
  PortfolioSection,
  ServiceAreaSection,
} from './ContractorCardEditorScreen/PortfolioSection';
import { PreviewModal } from './ContractorCardEditorScreen/PreviewModal';

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
      if (contractorProfile) {
        let businessAddr = contractorProfile.business_address;
        if (!businessAddr && user.address) {
          const parts = [user.address, user.city, user.postcode].filter(
            Boolean
          );
          businessAddr = parts.join(', ');
        }

        setProfile({
          ...contractorProfile,
          businessAddress: businessAddr || '',
          specialties: contractorProfile.specialties || [],
          portfolioImages: contractorProfile.portfolio_images || [],
          certifications: contractorProfile.certifications || [],
        });
      }
    } catch (error) {
      logger.error('Failed to load contractor profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
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
      }
    } catch (error) {
      logger.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removePortfolioImage = (imageUri: string) => {
    setProfile((prev) => ({
      ...prev,
      portfolioImages:
        prev.portfolioImages?.filter((img) => img !== imageUri) || [],
    }));
  };

  const saveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await ContractorService.updateContractorProfile(user.id, profile);
      Alert.alert('Success', 'Your discovery card has been updated!');
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
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Discovery Card</Text>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => setPreviewVisible(true)}
          accessibilityRole='button'
          accessibilityLabel='Preview card'
        >
          <Ionicons name='eye' size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LogoSection
          profile={profile}
          onPickLogo={() => handleImagePicker('logo')}
        />
        <BusinessInfoSection
          profile={profile}
          setProfile={setProfile}
          user={user}
        />
        <AvailabilitySection profile={profile} setProfile={setProfile} />
        <PortfolioSection
          profile={profile}
          onAddPortfolio={() => handleImagePicker('portfolio')}
          onRemoveImage={removePortfolioImage}
        />
        <ServiceAreaSection profile={profile} setProfile={setProfile} />

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

export default ContractorCardEditorScreen;
