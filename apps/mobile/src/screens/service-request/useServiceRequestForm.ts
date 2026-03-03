import { useState, useEffect } from 'react';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { JobService } from '../../services/JobService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { sanitize } from '@mintenance/security';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import type { ModalStackParamList } from '../../navigation/types';
import { type ServiceCategory } from './types';

export function useServiceRequestForm(onSuccess: () => void) {
  const { user } = useAuth();
  const route = useRoute<RouteProp<ModalStackParamList, 'ServiceRequest'>>();
  const initialPropertyId = route.params?.propertyId;
  const initialPriority = route.params?.priority;

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initialPriority ?? 'medium');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const { data: properties } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const res = await apiClient.get<{ properties: Property[] }>('/api/properties');
      return res.properties ?? [];
    },
    enabled: !!user,
  });

  // Pre-fill property from navigation params
  useEffect(() => {
    if (initialPropertyId && properties && !selectedProperty) {
      const prop = properties.find((p) => p.id === initialPropertyId);
      if (prop) {
        setSelectedProperty(prop);
        setLocation(prop.address ?? '');
      }
    }
  }, [initialPropertyId, properties, selectedProperty]);

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory('');
    setTitle(`${category.name} Service Request`);
    if (selectedProperty) setLocation(selectedProperty.address ?? '');
  };

  const handleSubcategorySelect = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    if (selectedCategory) setTitle(`${subcategory} - ${selectedCategory.name}`);
  };

  const requestPermissions = async (): Promise<boolean> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const showImagePickerOptions = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImageFromCamera();
          else if (buttonIndex === 2) pickImageFromLibrary();
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

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedCategory || !selectedSubcategory || !description || !location || !budget) {
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
      const uploadedPhotoUrls: string[] = [];
      for (const photoUri of photos) {
        const fileName = `jobs/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(uploadData.path);
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
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to post service request';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedCategory,
    selectedSubcategory,
    title, setTitle,
    description, setDescription,
    location, setLocation,
    budget, setBudget,
    priority, setPriority,
    photos,
    loading,
    selectedProperty, setSelectedProperty,
    properties,
    handleCategorySelect,
    handleSubcategorySelect,
    showImagePickerOptions,
    removePhoto,
    handleSubmit,
  };
}
