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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { PhotoUploadService } from '../../services/PhotoUploadService';
import { JobService } from '../../services/JobService';
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
  uploaded?: boolean;
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

  const photosToUpload = photos.filter((p) => !p.uploaded);
  const hasFailedPhotos = photos.some((p) => !p.uploaded) && photos.some((p) => p.uploaded);

  const handleUpload = useCallback(async () => {
    const pending = photos.filter((p) => !p.uploaded);
    if (pending.length === 0) {
      Alert.alert('No Photos', 'Please select at least one photo to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const assets = pending.map((p) => p.asset);
      const uploadFn = isBefore
        ? PhotoUploadService.uploadBeforePhotos
        : PhotoUploadService.uploadAfterPhotos;

      const results: Array<{ success: boolean }> = [];
      for (let i = 0; i < assets.length; i++) {
        setUploadProgress(((i) / assets.length) * 100);
        try {
          const result = await uploadFn.call(PhotoUploadService, jobId, [assets[i]]);
          results.push(...result);
        } catch {
          results.push({ success: false });
        }
        setUploadProgress(((i + 1) / assets.length) * 100);
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      // Mark successfully uploaded photos
      if (successCount > 0) {
        setPhotos((prev) => {
          const updatedPhotos = [...prev];
          let resultIndex = 0;
          for (let i = 0; i < updatedPhotos.length; i++) {
            if (!updatedPhotos[i].uploaded) {
              if (results[resultIndex]?.success) {
                updatedPhotos[i] = { ...updatedPhotos[i], uploaded: true };
              }
              resultIndex++;
            }
          }
          return updatedPhotos;
        });
      }

      if (failCount > 0) {
        Alert.alert(
          'Partial Upload',
          `${successCount} photo(s) uploaded successfully, ${failCount} failed. You can retry the failed uploads.`
        );
      } else {
        if (isBefore) {
          Alert.alert(
            'Upload Complete',
            `${successCount} before photo(s) uploaded. Ready to start the job?`,
            [
              { text: 'Not Yet', style: 'cancel', onPress: () => navigation.goBack() },
              {
                text: 'Start Job',
                onPress: async () => {
                  try {
                    await JobService.startJob(jobId);
                    Alert.alert('Job Started', 'The homeowner has been notified that work has begun.', [
                      { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                  } catch (startError) {
                    const msg = startError instanceof Error ? startError.message : 'Failed to start job';
                    Alert.alert('Could Not Start Job', msg, [
                      { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Upload Complete',
            `${successCount} after photo(s) uploaded. The homeowner will be notified to review your work.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
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
            color={isBefore ? theme.colors.primary : theme.colors.success}
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
              {photo.uploaded && (
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
                </View>
              )}
              {!photo.uploaded && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Ionicons name="close-circle" size={28} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Add Photo Buttons */}
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickFromCamera}
            accessibilityLabel="Take a photo"
          >
            <Ionicons name="camera" size={32} color={theme.colors.primary} />
            <Text style={styles.addPhotoText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickFromGallery}
            accessibilityLabel="Choose from gallery"
          >
            <Ionicons name="images" size={32} color={theme.colors.primary} />
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
          style={[styles.uploadButton, (uploading || photosToUpload.length === 0) && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading || photosToUpload.length === 0}
          accessibilityRole="button"
          accessibilityLabel={uploading ? 'Uploading photos' : 'Upload photos'}
        >
          {uploading ? (
            <View style={styles.uploadProgressContainer}>
              <Text style={styles.uploadButtonText}>
                Uploading {Math.min(Math.round((uploadProgress / 100) * photosToUpload.length) + 1, photosToUpload.length)} of {photosToUpload.length}...
              </Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          ) : (
            <>
              <Ionicons name={hasFailedPhotos ? 'refresh' : 'cloud-upload'} size={20} color={theme.colors.textInverse} />
              <Text style={styles.uploadButtonText}>
                {hasFailedPhotos
                  ? `Retry ${photosToUpload.length} Failed Photo${photosToUpload.length !== 1 ? 's' : ''}`
                  : `Upload ${photosToUpload.length} Photo${photosToUpload.length !== 1 ? 's' : ''}`}
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    width: theme.spacing[10],
    height: theme.spacing[10],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[24] + theme.spacing[6],
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing[3],
    marginBottom: theme.spacing.lg,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  photoItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.sm - 2,
    right: theme.spacing.sm - 2,
    backgroundColor: theme.colors.overlayWhite20,
    borderRadius: theme.borderRadius.xl - 2,
  },
  uploadedBadge: {
    position: 'absolute',
    top: theme.spacing.sm - 2,
    left: theme.spacing.sm - 2,
    backgroundColor: theme.colors.overlayWhite20,
    borderRadius: theme.borderRadius.xl - 2,
  },
  addPhotoButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  addPhotoText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  photoCount: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.large,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.buttonHeightLarge,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  uploadProgressContainer: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressBarTrack: {
    width: '80%',
    height: theme.spacing.xs,
    backgroundColor: theme.colors.overlayWhite20,
    borderRadius: theme.borderRadius.sm / 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: theme.spacing.xs,
    backgroundColor: theme.colors.textInverse,
    borderRadius: theme.borderRadius.sm / 2,
  },
});

export default JobPhotoUploadScreen;

