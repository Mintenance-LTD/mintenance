import { useState, useEffect } from 'react';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { JobService } from '../../services/JobService';
import { useAuth } from '../../contexts/AuthContext';
import { sanitize } from '@mintenance/security';
import { validateJobDraft } from '@mintenance/api-contracts';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import { LocationService } from '../../services/LocationService';
import type { Property } from '@mintenance/types';
import type { ModalStackParamList } from '../../navigation/types';
import { type ServiceCategory } from './types';

export function useServiceRequestForm(onSuccess: () => void) {
  const { user } = useAuth();
  const route = useRoute<RouteProp<ModalStackParamList, 'ServiceRequest'>>();
  const initialPropertyId = route.params?.propertyId;
  const initialPriority = route.params?.priority;

  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(
    initialPriority ?? 'medium'
  );
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );

  const { data: properties } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const res = await apiClient.get<{ properties: Property[] }>(
        '/api/properties'
      );
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

  // Auto-select primary property when form loads (if no explicit property passed)
  useEffect(() => {
    if (
      !selectedProperty &&
      !initialPropertyId &&
      properties &&
      properties.length > 0
    ) {
      const primary = properties.find((p) => p.is_primary) ?? properties[0];
      if (primary) {
        setSelectedProperty(primary);
        setLocation(primary.address ?? '');
      }
    }
  }, [properties, selectedProperty, initialPropertyId]);

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

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      const asset = !result.canceled ? result.assets?.[0] : undefined;
      if (asset) {
        setPhotos((prev) => [...prev, asset.uri]);
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
      const asset = !result.canceled ? result.assets?.[0] : undefined;
      if (asset) {
        setPhotos((prev) => [...prev, asset.uri]);
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
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
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
    if (!selectedCategory || !selectedSubcategory) {
      Alert.alert('Error', 'Please pick a service category');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to request a service');
      return;
    }
    // 2026-05-01 audit P1 close-out (per-screen validateJobDraft adoption):
    // run the canonical schema before submitting so the user sees the same
    // error message the route would have rejected with. Replaces the ad-hoc
    // "fill in all required fields" generic message — Zod gives field-level
    // detail (e.g. "Description must be at least 20 characters").
    const draftValidation = validateJobDraft({
      title,
      description,
      location,
      category: selectedCategory.id as
        | import('@mintenance/api-contracts').JobCategory
        | undefined,
      urgency: priority,
      propertyId: selectedProperty?.id,
    });
    if (!draftValidation.ok) {
      const first = draftValidation.errors[0];
      Alert.alert(
        'Cannot post yet',
        first?.message ?? 'Please review the form and try again.'
      );
      return;
    }

    setLoading(true);
    try {
      // Audit follow-up (2026-04-29): the upload-then-feed-URLs
      // loop is now in the shared `utils/uploadJobPhotos` helper so
      // `JobPostingScreen` can reuse it. Behaviour identical to
      // before — sequential POSTs to `/api/jobs/upload-photos`.
      const { uploadJobPhotos } = await import('../../utils/uploadJobPhotos');
      const uploadedPhotoUrls = await uploadJobPhotos(photos);

      // Capture device geolocation for contractor proximity matching
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const userLocation = await LocationService.getCurrentLocation();
        if (userLocation) {
          latitude = userLocation.latitude;
          longitude = userLocation.longitude;
        }
      } catch {
        // Geolocation is optional — continue without it
      }

      await JobService.createJob({
        title: sanitize.text(title, 200),
        description: sanitize.jobDescription(description),
        location: sanitize.address(location),
        homeownerId: user.id,
        category: selectedCategory.id,
        subcategory: selectedSubcategory
          ? sanitize.text(selectedSubcategory, 100)
          : undefined,
        urgency: priority,
        photos: uploadedPhotoUrls,
        property_id: selectedProperty?.id,
        latitude,
        longitude,
      });

      Alert.alert(
        'Success',
        'Service request posted successfully! Contractors in your area will be notified.',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to post service request';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedCategory,
    selectedSubcategory,
    title,
    setTitle,
    description,
    setDescription,
    location,
    setLocation,
    priority,
    setPriority,
    photos,
    loading,
    selectedProperty,
    setSelectedProperty,
    properties,
    handleCategorySelect,
    handleSubcategorySelect,
    showImagePickerOptions,
    removePhoto,
    handleSubmit,
  };
}
