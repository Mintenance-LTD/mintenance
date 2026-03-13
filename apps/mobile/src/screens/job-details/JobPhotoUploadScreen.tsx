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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
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
          // Auto-trigger job completion per spec Phase 8
          try {
            await JobService.completeJob(jobId);
          } catch {
            // Non-critical: backend may auto-complete via photo webhook
          }
          Alert.alert(
            'Job Completed',
            `${successCount} after photo(s) uploaded. The homeowner has been notified to review your work.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch {
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
          <Ionicons name="arrow-back" size={22} color="#222222" />
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
            color={isBefore ? '#222222' : '#10B981'}
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
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                </View>
              )}
              {!photo.uploaded && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Ionicons name="close-circle" size={28} color="#EF4444" />
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
            <Ionicons name="camera" size={32} color="#222222" />
            <Text style={styles.addPhotoText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickFromGallery}
            accessibilityLabel="Choose from gallery"
          >
            <Ionicons name="images" size={32} color="#222222" />
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
              <Ionicons name={hasFailedPhotos ? 'refresh' : 'cloud-upload'} size={20} color="#FFFFFF" />
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
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#717171',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#222222',
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
    borderRadius: 16,
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
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 14,
  },
  uploadedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 14,
  },
  addPhotoButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#717171',
  },
  photoCount: {
    marginTop: 16,
    fontSize: 13,
    color: '#717171',
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  uploadButton: {
    backgroundColor: '#222222',
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadProgressContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  progressBarTrack: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});

export default JobPhotoUploadScreen;
