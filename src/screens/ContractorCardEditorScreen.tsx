import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile } from '../types';
import { theme } from '../theme';
import { logger } from '../utils/logger';
import Button from '../components/ui/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ContractorCardEditorScreenProps {
  navigation: StackNavigationProp<any>;
}

export const ContractorCardEditorScreen: React.FC<ContractorCardEditorScreenProps> = ({
  navigation,
}) => {
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
      const contractorProfile = await ContractorService.getContractorProfile(user.id);
      if (contractorProfile) {
        setProfile({
          ...contractorProfile,
          specialties: contractorProfile.specialties || [],
          portfolioImages: contractorProfile.portfolioImages || [],
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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [4, 3],
        quality: 0.8,
        allowsMultipleSelection: type === 'portfolio',
      });

      if (!result.canceled) {
        if (type === 'logo') {
          setProfile(prev => ({ ...prev, companyLogo: result.assets[0].uri }));
        } else {
          const newImages = result.assets.map(asset => asset.uri);
          setProfile(prev => ({
            ...prev,
            portfolioImages: [...(prev.portfolioImages || []), ...newImages].slice(0, 8)
          }));
        }
      }
    } catch (error) {
      logger.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const addSpecialty = (specialty: string) => {
    if (specialty.trim() && !profile.specialties?.includes(specialty.trim())) {
      setProfile(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), specialty.trim()]
      }));
    }
  };

  const removeSpecialty = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties?.filter(s => s !== specialty) || []
    }));
  };

  const removePortfolioImage = (imageUri: string) => {
    setProfile(prev => ({
      ...prev,
      portfolioImages: prev.portfolioImages?.filter(img => img !== imageUri) || []
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
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Discovery Card</Text>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => setPreviewVisible(true)}
        >
          <Ionicons name="eye" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company Logo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Logo</Text>
          <TouchableOpacity
            style={styles.logoUpload}
            onPress={() => handleImagePicker('logo')}
          >
            {profile.companyLogo ? (
              <Image source={{ uri: profile.companyLogo }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.logoPlaceholderText}>Add Company Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company Name</Text>
            <TextInput
              style={styles.textInput}
              value={profile.companyName}
              onChangeText={(text) => setProfile(prev => ({ ...prev, companyName: text }))}
              placeholder="Your business name"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Professional Bio</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={profile.bio}
              onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
              placeholder="Describe your expertise and what sets you apart..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business Address</Text>
            <TextInput
              style={styles.textInput}
              value={profile.businessAddress}
              onChangeText={(text) => setProfile(prev => ({ ...prev, businessAddress: text }))}
              placeholder="123 Main St, City, State"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Hourly Rate ($)</Text>
              <TextInput
                style={styles.textInput}
                value={profile.hourlyRate?.toString() || ''}
                onChangeText={(text) => setProfile(prev => ({
                  ...prev,
                  hourlyRate: parseInt(text) || 0
                }))}
                placeholder="75"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Years Experience</Text>
              <TextInput
                style={styles.textInput}
                value={profile.yearsExperience?.toString() || ''}
                onChangeText={(text) => setProfile(prev => ({
                  ...prev,
                  yearsExperience: parseInt(text) || 0
                }))}
                placeholder="10"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Availability Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.availabilityOptions}>
            {['immediate', 'this_week', 'this_month', 'busy'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.availabilityOption,
                  profile.availability === option && styles.availabilityOptionActive
                ]}
                onPress={() => setProfile(prev => ({ ...prev, availability: option as any }))}
              >
                <Text style={[
                  styles.availabilityText,
                  profile.availability === option && styles.availabilityTextActive
                ]}>
                  {option.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Portfolio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Portfolio</Text>
          <Text style={styles.sectionSubtitle}>Show your best work (up to 8 photos)</Text>

          <TouchableOpacity
            style={styles.addPortfolioButton}
            onPress={() => handleImagePicker('portfolio')}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
            <Text style={styles.addPortfolioText}>Add Portfolio Images</Text>
          </TouchableOpacity>

          {profile.portfolioImages && profile.portfolioImages.length > 0 && (
            <View style={styles.portfolioGrid}>
              {profile.portfolioImages.map((imageUri, index) => (
                <View key={index} style={styles.portfolioItem}>
                  <Image source={{ uri: imageUri }} style={styles.portfolioImage} />
                  <TouchableOpacity
                    style={styles.removePortfolioButton}
                    onPress={() => removePortfolioImage(imageUri)}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Service Area */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Area</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Radius (km)</Text>
            <TextInput
              style={styles.textInput}
              value={profile.serviceRadius?.toString() || '25'}
              onChangeText={(text) => setProfile(prev => ({
                ...prev,
                serviceRadius: parseInt(text) || 25
              }))}
              placeholder="25"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Button
            variant="primary"
            title={saving ? "Saving..." : "Save Discovery Card"}
            onPress={saveProfile}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Discovery Card Preview</Text>
            <TouchableOpacity onPress={() => setPreviewVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.previewContent}>
            {/* Simplified contractor card preview */}
            <View style={styles.cardPreview}>
              {profile.companyLogo && (
                <Image source={{ uri: profile.companyLogo }} style={styles.previewLogo} />
              )}
              <Text style={styles.previewCompanyName}>{profile.companyName || 'Your Company'}</Text>
              <Text style={styles.previewBio}>{profile.bio || 'Your professional bio...'}</Text>
              <Text style={styles.previewRate}>${profile.hourlyRate || 0}/hr</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  previewButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginTop: 16,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  logoUpload: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.lg,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoPlaceholderText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  availabilityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilityOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  availabilityOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  availabilityText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  availabilityTextActive: {
    color: theme.colors.textInverse,
  },
  addPortfolioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addPortfolioText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioItem: {
    position: 'relative',
    width: '48%',
    aspectRatio: 4 / 3,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.md,
  },
  removePortfolioButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSection: {
    paddingVertical: 24,
  },
  saveButton: {
    width: '100%',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cardPreview: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  previewLogo: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 16,
  },
  previewCompanyName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  previewBio: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  previewRate: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default ContractorCardEditorScreen;