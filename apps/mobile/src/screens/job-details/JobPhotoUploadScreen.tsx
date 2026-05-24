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
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { PhotoUploadService } from '../../services/PhotoUploadService';
import { JobService } from '../../services/JobService';
import { queryKeys } from '../../lib/queryClient';
import { JobsStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import { styles } from './jobPhotoUploadStyles';

type ScreenRouteProp = RouteProp<JobsStackParamList, 'PhotoUpload'>;
type ScreenNavigationProp = NativeStackNavigationProp<
  JobsStackParamList,
  'PhotoUpload'
>;

interface Props {
  route: ScreenRouteProp;
  navigation: ScreenNavigationProp;
}

interface SelectedPhoto {
  uri: string;
  asset: ImagePicker.ImagePickerAsset;
  uploaded?: boolean;
}

export const JobPhotoUploadScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { jobId, photoType } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const qc = useQueryClient();
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
      Alert.alert(
        t('permissions.camera.title'),
        t('permissions.camera.message')
      );
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
  const hasFailedPhotos =
    photos.some((p) => !p.uploaded) && photos.some((p) => p.uploaded);

  const handleUpload = useCallback(async () => {
    const pending = photos.filter((p) => !p.uploaded);
    if (pending.length === 0) {
      Alert.alert('No Photos', 'Please select at least one photo to upload.');
      return;
    }

    // MUI-P1-2: fail fast when offline instead of letting three retries of
    // each photo all time out with a generic error. PhotoUploadService has
    // its own per-photo retry (MSV-P1-8) for transient network failures;
    // this covers the "clearly offline when user tapped Upload" case.
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      Alert.alert(
        'No Internet Connection',
        'Photo upload requires an internet connection. Please reconnect and try again — your selected photos will remain here.'
      );
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const assets = pending.map((p) => p.asset);
      const uploadFn = isBefore
        ? PhotoUploadService.uploadBeforePhotos
        : PhotoUploadService.uploadAfterPhotos;

      const results: Array<{ success: boolean; jobCompleted?: boolean }> = [];
      for (let i = 0; i < assets.length; i++) {
        setUploadProgress((i / assets.length) * 100);
        try {
          const asset = assets[i];
          if (!asset) continue;
          const result = await uploadFn.call(PhotoUploadService, jobId, [
            asset,
          ]);
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
            const photo = updatedPhotos[i];
            if (photo && !photo.uploaded) {
              if (results[resultIndex]?.success) {
                updatedPhotos[i] = { ...photo, uploaded: true };
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
              {
                text: 'Not Yet',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
              {
                text: 'Start Job',
                onPress: async () => {
                  try {
                    await JobService.startJob(jobId);
                    // 2026-05-24 audit-39 P2: previously goBack()'d
                    // without invalidating any job query, so the
                    // detail screen showed the assigned-state CTA
                    // until the next manual refetch. Invalidate the
                    // job detail + list keys so the upstream screen
                    // re-renders with status='in_progress' immediately.
                    qc.invalidateQueries({
                      queryKey: queryKeys.jobs.details(jobId),
                    });
                    qc.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
                    Alert.alert(
                      'Job Started',
                      'The homeowner has been notified that work has begun.',
                      [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                  } catch (startError) {
                    const msg =
                      startError instanceof Error
                        ? startError.message
                        : 'Failed to start job';
                    Alert.alert('Could Not Start Job', msg, [
                      { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                  }
                },
              },
            ]
          );
        } else {
          // 2026-05-24 audit-39 P1: the /api/jobs/[id]/photos/after
          // route conditionally auto-completes the job (gated on
          // contractor assignment + held escrow). If those checks
          // fail the photos still upload but the job stays
          // in_progress — previously we showed "Job Completed"
          // unconditionally, lying to the contractor and skipping the
          // homeowner's review trigger. Use the server's jobCompleted
          // flag (now plumbed through PhotoUploadService) to pick the
          // right message.
          const completed = results.some((r) => r.jobCompleted === true);
          // Invalidate the job detail so the next view reflects the
          // new state regardless of which branch ran.
          qc.invalidateQueries({ queryKey: queryKeys.jobs.details(jobId) });
          qc.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
          Alert.alert(
            completed ? 'Job Completed' : 'Photos Uploaded',
            completed
              ? `${successCount} after photo(s) uploaded. The homeowner has been notified to review your work.`
              : `${successCount} after photo(s) uploaded. The job hasn't been auto-completed yet — usually because escrow isn't held. Contact support if this persists.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch {
      Alert.alert(
        'Upload Failed',
        'Failed to upload photos. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  }, [photos, jobId, isBefore, navigation, qc]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
      </View>

      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>{isBefore ? 'Before' : 'After'}</Text>
        <Text style={styles.headline}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
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
            color={isBefore ? me.ink : me.brand}
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
                  <Ionicons
                    name='checkmark-circle'
                    size={28}
                    color={me.brand}
                  />
                </View>
              )}
              {!photo.uploaded && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Ionicons name='close-circle' size={28} color={me.errFg} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Add Photo Buttons */}
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickFromCamera}
            accessibilityLabel='Take a photo'
          >
            <Ionicons name='camera' size={32} color={me.ink} />
            <Text style={styles.addPhotoText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickFromGallery}
            accessibilityLabel='Choose from gallery'
          >
            <Ionicons name='images' size={32} color={me.ink} />
            <Text style={styles.addPhotoText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.photoCount}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          {photos.length === 0 ? ' (minimum 1 required)' : ''}
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (uploading || photosToUpload.length === 0) &&
              styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={uploading || photosToUpload.length === 0}
          accessibilityRole='button'
          accessibilityLabel={uploading ? 'Uploading photos' : 'Upload photos'}
        >
          {uploading ? (
            <View style={styles.uploadProgressContainer}>
              <Text style={styles.uploadButtonText}>
                Uploading{' '}
                {Math.min(
                  Math.round((uploadProgress / 100) * photosToUpload.length) +
                    1,
                  photosToUpload.length
                )}{' '}
                of {photosToUpload.length}...
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${uploadProgress}%` },
                  ]}
                />
              </View>
            </View>
          ) : (
            <>
              <Ionicons
                name={hasFailedPhotos ? 'refresh' : 'cloud-upload'}
                size={20}
                color={me.onBrand}
              />
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

export default JobPhotoUploadScreen;
