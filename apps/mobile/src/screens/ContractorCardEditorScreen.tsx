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
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { ContractorService } from '../services/ContractorService';
import { ContractorProfile } from '@mintenance/types';
import { logger } from '../utils/logger';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ContractorCardEditorScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ContractorCardEditor'>;
}

export const ContractorCardEditorScreen: React.FC<ContractorCardEditorScreenProps> = ({
  navigation,
}) => {
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
      const contractorProfile = await ContractorService.getContractorProfile(user.id);
      if (contractorProfile) {
        setProfile({
          ...contractorProfile,
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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
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
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#222222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Discovery Card</Text>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => setPreviewVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Preview card"
        >
          <Ionicons name="eye" size={22} color="#222222" />
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
                <View style={styles.cameraIconWrap}>
                  <Ionicons name="camera" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.logoPlaceholderText}>Add Company Logo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <Input
            label='Company Name'
            value={profile.companyName}
            onChangeText={(text) => setProfile(prev => ({ ...prev, companyName: text }))}
            placeholder="Your business name"
            leftIcon='business-outline'
            variant='outline'
            size='lg'
            fullWidth
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Professional Bio</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={profile.bio}
              onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
              placeholder="Describe your expertise and what sets you apart..."
              placeholderTextColor="#B0B0B0"
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
              placeholderTextColor="#B0B0B0"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Hourly Rate (£)</Text>
              <TextInput
                style={styles.textInput}
                value={profile.hourlyRate?.toString() || ''}
                onChangeText={(text) => setProfile(prev => ({
                  ...prev,
                  hourlyRate: parseInt(text) || 0
                }))}
                placeholder="75"
                placeholderTextColor="#B0B0B0"
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
                placeholderTextColor="#B0B0B0"
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
                onPress={() => setProfile(prev => ({ ...prev, availability: option as 'immediate' | 'this_week' | 'this_month' | 'busy' }))}
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
            <Ionicons name="add" size={22} color="#717171" />
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
              placeholderTextColor="#B0B0B0"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save Button */}
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

      {/* Preview Modal */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewContainer}>
          <View style={[styles.previewHeader, { paddingTop: insets.top }]}>
            <Text style={styles.previewTitle}>Discovery Card Preview</Text>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewVisible(false)}
            >
              <Ionicons name="close" size={22} color="#222222" />
            </TouchableOpacity>
          </View>
          <View style={styles.previewContent}>
            <View style={styles.cardPreview}>
              {profile.companyLogo && (
                <Image source={{ uri: profile.companyLogo }} style={styles.previewLogo} />
              )}
              <Text style={styles.previewCompanyName}>{profile.companyName || 'Your Company'}</Text>
              <Text style={styles.previewBio}>{profile.bio || 'Your professional bio...'}</Text>
              <View style={styles.previewRateChip}>
                <Text style={styles.previewRate}>£{profile.hourlyRate || 0}/hr</Text>
              </View>
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
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0B0B0',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#717171',
    marginBottom: 16,
    marginTop: -6,
  },
  logoUpload: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderStyle: 'dashed',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  cameraIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoPlaceholderText: {
    color: '#717171',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#222222',
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
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
  },
  availabilityOptionActive: {
    backgroundColor: '#222222',
  },
  availabilityText: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '500',
  },
  availabilityTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addPortfolioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
  },
  addPortfolioText: {
    fontSize: 15,
    color: '#222222',
    fontWeight: '600',
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
    borderRadius: 12,
  },
  removePortfolioButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: '#222222',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  previewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cardPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  previewLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
  },
  previewCompanyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },
  previewBio: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  previewRateChip: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  previewRate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
});

export default ContractorCardEditorScreen;
