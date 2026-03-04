/**
 * JobPhotoUploadScreen - Contractor uploads before/after photos
 *
 * Before photos: Required before starting a job (Phase 6)
 * After photos: Uploaded when work is complete, auto-triggers job completion (Phase 8)
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { PhotoUploadService } from '../../services/PhotoUploadService';
import { JobsStackParamList } from '../../navigation/types';

type ScreenRouteProp = RouteProp<JobsStackParamList, 'PhotoUpload'>;
type ScreenNavigationProp = NativeStackNavigationProp<JobsStackParamList, 'PhotoUpload'>;

interface Props {
  route: ScreenRouteProp;
  navigation: ScreenNavigationProp;
}

interface SelectedPhoto {
  uri: string;
  asset: ImagePicker.ImagePickerAsset;
}

export const JobPhotoUploadScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, photoType } = route.params;
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isBefore = photoType === 'before';
  const title = isBefore ? 'Upload Before Photos' : 'Upload After Photos';
  const subtitle = isBefore
    ? 'Document the current condition before starting work'
    : 'Document the completed work for homeowner review';

  const pickFromCamera = useCallback(async () => {
    const permissions = await PhotoUploadService.requestPermissions();
    if (!permissions.camera) {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      exif: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos = result.assets.map((asset) => ({
        uri: asset.uri,
        asset,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos = result.assets.map((asset) => ({
        uri: asset.uri,
        asset,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please select at least one photo to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const assets = photos.map((p) => p.asset);
      const uploadFn = isBefore
        ? PhotoUploadService.uploadBeforePhotos
        : PhotoUploadService.uploadAfterPhotos;

      const results = await uploadFn.call(PhotoUploadService, jobId, assets);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount > 0) {
        Alert.alert(
          'Partial Upload',
          `${successCount} photo(s) uploaded successfully, ${failCount} failed.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Upload Complete',
          isBefore
            ? `${successCount} before photo(s) uploaded. You can now start the job.`
            : `${successCount} after photo(s) uploaded. The homeowner will be notified to review your work.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [photos, jobId, isBefore, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons
            name={isBefore ? 'camera-outline' : 'checkmark-circle-outline'}
            size={24}
            color='#717171'
          />
          <Text style={styles.infoText}>
            {isBefore
              ? 'Take clear photos of the area that needs work. Include wide shots and close-ups of any damage or issues.'
              : 'Take photos of the completed work from the same angles as your before photos for easy comparison.'}
          </Text>
        </View>

        {/* Photo Grid */}
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <Ionicons name="close-circle" size={28} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Photo Buttons */}
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickFromCamera}
            accessibilityLabel="Take a photo"
          >
            <Ionicons name="camera" size={32} color='#717171' />
            <Text style={styles.addPhotoText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickFromGallery}
            accessibilityLabel="Choose from gallery"
          >
            <Ionicons name="images" size={32} color='#717171' />
            <Text style={styles.addPhotoText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.photoCount}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          {photos.length === 0 ? ' (minimum 1 required)' : ''}
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.uploadButton, (uploading || photos.length === 0) && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading || photos.length === 0}
          accessibilityRole="button"
          accessibilityLabel={uploading ? 'Uploading photos' : 'Upload photos'}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>
                Upload {photos.length} Photo{photos.length !== 1 ? 's' : ''}
              </Text>
            </>
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
  addPhotoButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  photoCount: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.large,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default JobPhotoUploadScreen;

