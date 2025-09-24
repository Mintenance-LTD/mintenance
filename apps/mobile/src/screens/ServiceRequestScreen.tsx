import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { JobService } from '../services/JobService';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';

interface Props {
  navigation: StackNavigationProp<any>;
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
    color: theme.colors.info,
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
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
    // Auto-generate title based on category
    setTitle(`${category.name} Service Request`);
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
      await JobService.createJob({
        title,
        description,
        location,
        budget: budgetNumber,
        homeownerId: user.id,
        // Additional metadata for enhanced job posting
        category: selectedCategory.id,
        subcategory: selectedSubcategory,
        priority,
        photos, // TODO: Upload to storage service
      });

      Alert.alert(
        'Success',
        'Service request posted successfully! Contractors in your area will be notified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post service request');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCategory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name='arrow-back' size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Service</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>What service do you need?</Text>
            <Text style={styles.sectionSubtitle}>
              Select a category to get started
            </Text>

            <View style={styles.categoriesGrid}>
              {serviceCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, { borderColor: category.color }]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedCategory(null)}
        >
          <Ionicons name='arrow-back' size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedCategory.name} Service</Text>
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
            placeholder='Enter your budget in dollars'
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
                onPress={() => setPriority(level.id as any)}
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
                    { color: priority === level.id ? theme.colors.white : '#666' },
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

          <ScrollView
            horizontal
            style={styles.photosContainer}
            showsHorizontalScrollIndicator={false}
          >
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name='close-circle' size={24} color='#FF3B30' />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < 5 && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={showImagePickerOptions}
              >
                <Ionicons name='camera' size={30} color='#666' />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
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
    backgroundColor: theme.colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
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
    fontWeight: 'bold',
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
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    ...theme.shadows.base,
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
    fontWeight: 'bold',
  },
  priorityDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  photosContainer: {
    marginTop: 10,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 10,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  addPhotoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 5,
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
    fontWeight: 'bold',
  },
});

export default ServiceRequestScreen;
