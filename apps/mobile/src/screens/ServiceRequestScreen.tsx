import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute } from '@react-navigation/native';
import { JobService } from '../services/JobService';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { supabase } from '../config/supabase';
import { sanitize } from '@mintenance/security';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';
import type { Property } from '@mintenance/types';

interface Props {
  navigation: StackNavigationProp<unknown>;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
}

const serviceCategories: ServiceCategory[] = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: 'water-outline',
    color: theme.colors.primary,
    subcategories: [
      'Leaking',
      'Blocked Drain',
      'Installation',
      'Repair',
      'Emergency',
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: 'flash-outline',
    color: '#FF9500',
    subcategories: [
      'Wiring',
      'Outlet Installation',
      'Lighting',
      'Panel Upgrade',
      'Emergency',
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: 'thermometer-outline',
    color: '#4CD964',
    subcategories: [
      'AC Repair',
      'Heating',
      'Installation',
      'Maintenance',
      'Duct Cleaning',
    ],
  },
  {
    id: 'general',
    name: 'General Maintenance',
    icon: 'hammer-outline',
    color: '#5856D6',
    subcategories: [
      'Painting',
      'Carpentry',
      'Tiling',
      'Flooring',
      'General Repairs',
    ],
  },
  {
    id: 'appliance',
    name: 'Appliance Repair',
    icon: 'home-outline',
    color: '#FF3B30',
    subcategories: [
      'Washing Machine',
      'Refrigerator',
      'Dishwasher',
      'Oven',
      'Other',
    ],
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: 'leaf-outline',
    color: '#34C759',
    subcategories: [
      'Lawn Care',
      'Tree Service',
      'Garden Design',
      'Irrigation',
      'Cleanup',
    ],
  },
];

const priorityLevels = [
  {
    id: 'low',
    name: 'Low',
    color: '#34C759',
    description: 'Can wait a few days',
  },
  {
    id: 'medium',
    name: 'Medium',
    color: '#FF9500',
    description: 'Should be done this week',
  },
  {
    id: 'high',
    name: 'High',
    color: '#FF3B30',
    description: 'Urgent - needs attention ASAP',
  },
];

const ServiceRequestScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const route = useRoute<any>();
  const initialPropertyId = route.params?.propertyId as string | undefined;
  const initialPriority = route.params?.priority as 'low' | 'medium' | 'high' | undefined;

  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initialPriority || 'medium');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const { data: properties } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: () => apiClient.get<Property[]>('/api/properties'),
    enabled: !!user,
  });

  // Pre-fill property from navigation params
  useEffect(() => {
    if (initialPropertyId && properties && !selectedProperty) {
      const prop = properties.find((p) => p.id === initialPropertyId);
      if (prop) {
        setSelectedProperty(prop);
        setLocation(`${prop.address_line1}, ${prop.city}, ${prop.postcode}`);
      }
    }
  }, [initialPropertyId, properties]);

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
    // Auto-generate title based on category
    setTitle(`${category.name} Service Request`);
    // Auto-fill location from selected property
    if (selectedProperty) {
      setLocation(`${selectedProperty.address_line1}, ${selectedProperty.city}, ${selectedProperty.postcode}`);
    }
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    // Update title with more specific info
    if (selectedCategory) {
      setTitle(`${subcategory} - ${selectedCategory.name}`);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'We need camera and photo library permissions to let you add photos to your service request.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const showImagePickerOptions = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImageFromCamera();
          } else if (buttonIndex === 2) {
            pickImageFromLibrary();
          }
        }
      );
    } else {
      Alert.alert('Select Photo', 'Choose how you want to add a photo', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: pickImageFromCamera },
        { text: 'Choose from Library', onPress: pickImageFromLibrary },
      ]);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (
      !selectedCategory ||
      !selectedSubcategory ||
      !description ||
      !location ||
      !budget
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to request a service');
      return;
    }

    const budgetNumber = parseFloat(budget);
    if (isNaN(budgetNumber) || budgetNumber <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    setLoading(true);
    try {
      // Upload photos to Supabase Storage and collect public URLs
      const uploadedPhotoUrls: string[] = [];
      for (const photoUri of photos) {
        const fileName = `jobs/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage
          .from('job-photos')
          .getPublicUrl(uploadData.path);
        uploadedPhotoUrls.push(urlData.publicUrl);
      }

      await JobService.createJob({
        title: sanitize.text(title, 200),
        description: sanitize.jobDescription(description),
        location: sanitize.address(location),
        budget: budgetNumber,
        homeownerId: user.id,
        category: selectedCategory.id,
        subcategory: selectedSubcategory ? sanitize.text(selectedSubcategory, 100) : undefined,
        priority,
        photos: uploadedPhotoUrls,
        property_id: selectedProperty?.id,
      });

      Alert.alert(
        'Success',
        'Service request posted successfully! Contractors in your area will be notified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to post service request';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCategory) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Go back'
          >
            <Ionicons name='arrow-back' size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole='header'>Request Service</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle} accessibilityRole='header'>What service do you need?</Text>
            <Text style={styles.sectionSubtitle}>
              Select a category to get started
            </Text>

            <View style={styles.categoriesGrid}>
              {serviceCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, { backgroundColor: category.color + '15' }]}
                  onPress={() => handleCategorySelect(category)}
                  accessibilityRole='button'
                  accessibilityLabel={`${category.name} service category`}
                  accessibilityHint='Double tap to select this category'
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as unknown}
                      size={30}
                      color={theme.colors.white}
                    />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCategory(null)}
          accessibilityRole='button'
          accessibilityLabel='Go back to category selection'
        >
          <Ionicons name='arrow-back' size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole='header'>{selectedCategory.name} Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Subcategory Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            What specific service do you need?
          </Text>
          <View style={styles.subcategoriesContainer}>
            {selectedCategory.subcategories.map((subcategory) => (
              <TouchableOpacity
                key={subcategory}
                style={[
                  styles.subcategoryChip,
                  selectedSubcategory === subcategory && {
                    backgroundColor: selectedCategory.color,
                    borderColor: selectedCategory.color,
                  },
                ]}
                onPress={() => handleSubcategorySelect(subcategory)}
                accessibilityRole='radio'
                accessibilityLabel={subcategory}
                accessibilityState={{ selected: selectedSubcategory === subcategory }}
              >
                <Text
                  style={[
                    styles.subcategoryText,
                    selectedSubcategory === subcategory &&
                      styles.subcategoryTextSelected,
                  ]}
                >
                  {subcategory}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Property Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Which property?</Text>
          <Text style={styles.sectionSubtitle}>
            Select the property for this service request
          </Text>

          {properties && properties.length > 0 ? (
            <View>
              {properties.map((property) => (
                <TouchableOpacity
                  key={property.id}
                  style={[
                    styles.propertyOption,
                    selectedProperty?.id === property.id && styles.propertyOptionSelected,
                  ]}
                  onPress={() => setSelectedProperty(property)}
                  accessibilityRole='radio'
                  accessibilityLabel={`${property.address_line1}, ${property.city}`}
                  accessibilityState={{ selected: selectedProperty?.id === property.id }}
                >
                  <View style={styles.propertyOptionContent}>
                    <Ionicons
                      name='home-outline'
                      size={20}
                      color={selectedProperty?.id === property.id ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <View style={styles.propertyOptionText}>
                      <Text style={[
                        styles.propertyAddress,
                        selectedProperty?.id === property.id && styles.propertyAddressSelected,
                      ]}>{property.address_line1}</Text>
                      <Text style={styles.propertyLocation}>{property.city}, {property.postcode}</Text>
                    </View>
                    {selectedProperty?.id === property.id && (
                      <Ionicons name='checkmark-circle' size={22} color={theme.colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPropertyInline}
              onPress={() => {
                navigation.goBack();
                // Navigate to AddProperty through the Profile stack after closing modal
                setTimeout(() => {
                  navigation.navigate('Main', {
                    screen: 'ProfileTab',
                    params: { screen: 'AddProperty' },
                  });
                }, 300);
              }}
              accessibilityRole='button'
              accessibilityLabel='Add your first property'
            >
              <Ionicons name='add-circle' size={22} color={theme.colors.primary} />
              <Text style={styles.addPropertyInlineText}>Add Your First Property</Text>
              <Ionicons name='chevron-forward' size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Job Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Service Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder='e.g., Fix Leaking Kitchen Faucet'
          />

          <Text style={styles.label}>Problem Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder='Describe the problem in detail... What exactly needs to be fixed or installed?'
            multiline
            numberOfLines={4}
            textAlignVertical='top'
          />

          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder='Your address or area'
          />

          <Text style={styles.label}>Budget *</Text>
          <TextInput
            style={styles.input}
            value={budget}
            onChangeText={setBudget}
            placeholder='Enter your budget in pounds'
            keyboardType='numeric'
          />
        </View>

        {/* Priority Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority Level</Text>
          <View style={styles.priorityContainer}>
            {priorityLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.priorityCard,
                  { borderColor: level.color },
                  priority === level.id && { backgroundColor: level.color },
                ]}
                onPress={() => setPriority(level.id as unknown)}
                accessibilityRole='radio'
                accessibilityLabel={`${level.name} priority: ${level.description}`}
                accessibilityState={{ selected: priority === level.id }}
              >
                <Text
                  style={[
                    styles.priorityName,
                    { color: priority === level.id ? theme.colors.white : level.color },
                  ]}
                >
                  {level.name}
                </Text>
                <Text
                  style={[
                    styles.priorityDescription,
                    { color: priority === level.id ? theme.colors.white : theme.colors.textSecondary },
                  ]}
                >
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Add photos to help contractors understand the problem better
          </Text>

          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoSlot}>
                <Image source={{ uri: photo }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                  accessibilityRole='button'
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Ionicons name='close-circle' size={24} color='#FF3B30' />
                </TouchableOpacity>
              </View>
            ))}

            {Array.from({ length: Math.min(4 - photos.length, 4) }).map((_, idx) => (
              <TouchableOpacity
                key={`empty-${idx}`}
                style={styles.photoSlotEmpty}
                onPress={showImagePickerOptions}
                accessibilityRole='button'
                accessibilityLabel='Add photo'
                accessibilityHint='Double tap to take or choose a photo of the problem'
              >
                <Ionicons name='camera-outline' size={28} color={theme.colors.textTertiary} />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: selectedCategory.color },
            loading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole='button'
          accessibilityLabel={loading ? 'Posting service request' : 'Submit service request'}
          accessibilityState={{ disabled: loading }}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Posting...' : 'Request Service'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  categorySection: {
    padding: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 8,
    borderBottomColor: theme.colors.borderLight,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subcategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: 10,
    marginBottom: 10,
  },
  subcategoryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  subcategoryTextSelected: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: 15,
    backgroundColor: theme.colors.background,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 120,
    paddingTop: 15,
  },
  priorityContainer: {
    marginTop: 10,
  },
  priorityCard: {
    padding: 15,
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    backgroundColor: theme.colors.background,
    marginBottom: 10,
  },
  priorityName: {
    fontSize: 16,
    fontWeight: '700',
  },
  priorityDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoSlotEmpty: {
    width: '47%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  addPhotoText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  submitButton: {
    height: 50,
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  propertyOption: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    backgroundColor: theme.colors.background,
  },
  propertyOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0FDF4',
  },
  propertyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  propertyAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  propertyAddressSelected: {
    color: theme.colors.primary,
  },
  propertyLocation: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addPropertyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    gap: 10,
  },
  addPropertyInlineText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default ServiceRequestScreen;
