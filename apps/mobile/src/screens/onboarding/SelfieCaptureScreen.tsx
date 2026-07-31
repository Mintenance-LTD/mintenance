/**
 * SelfieCaptureScreen — Tier 1 step 7 (final) of the 2026-04-19
 * mobile onboarding audit (§5.3). Front-camera-only capture
 * screen with NO library picker — matches the audit's anti-
 * stock-photo-fraud intent.
 *
 * Capture → preview → upload flow:
 *   1. Request camera permission (useCameraPermissions).
 *   2. Show live CameraView locked to the front camera with an
 *      oval face-outline overlay.
 *   3. Capture button runs takePictureAsync; the URI is held in
 *      local state and rendered as a preview with "Use photo"
 *      and "Retake" buttons. No frame goes to the server until
 *      the user confirms.
 *   4. On confirm: POST the frame as multipart to
 *      /api/users/selfie, which uploads it with the service role and
 *      sets profile_image_url + the profile_photo_is_selfie trust
 *      flag (a flag clients are deliberately not granted).
 *
 * Intentionally NO "pick from library" affordance. The oval
 * overlay is a UX cue, not a face-detection check — pose / face
 * validation would be a follow-up.
 */

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { me } from '../../design-system/mint-editorial';

export const SelfieCaptureScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) setPreviewUri(photo.uri);
    } catch (err) {
      logger.warn('SelfieCaptureScreen: takePictureAsync failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      Alert.alert('Camera error', 'Could not take the photo. Try again.');
    }
  };

  const handleRetake = () => setPreviewUri(null);

  const handleConfirm = async () => {
    if (!previewUri || !user?.id) return;
    setUploading(true);
    try {
      // 2026-07-31: this used to upload client-side (fetch → blob →
      // arrayBuffer → supabase.storage) and then write the profiles row
      // directly. That failed for THREE independent reasons, all verified
      // against the live project:
      //   1. the storage INSERT policy on `profile-images` requires
      //      auth.uid() === foldername[1], but the path was
      //      `selfies/{uid}/…` → first folder "selfies" → RLS 403;
      //   2. `profiles.profile_photo_is_selfie` has SELECT but NOT UPDATE
      //      for `authenticated` (it's a trust signal, deliberately
      //      client-unwritable) → 42501 even if the upload had landed;
      //   3. the RN fetch→blob→arrayBuffer pattern is the one documented
      //      as "never landed bytes" on Hermes (see the assessment-photo
      //      fix, AUDIT_LOG 2026-07-26).
      // Server-mediated multipart fixes all three at once: the service
      // role bypasses storage RLS, sets the trust flag legitimately, and
      // the {uri,name,type} part is the pattern proven to work on device.
      const formData = new FormData();
      formData.append('selfie', {
        uri: previewUri,
        name: `selfie-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);

      await mobileApiClient.postFormData('/api/users/selfie', formData);

      await refreshUser();
      navigation.goBack();
    } catch (err) {
      logger.error('SelfieCaptureScreen: upload failed', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      Alert.alert(
        'Upload failed',
        'Could not save your selfie. Please check your connection and try again.'
      );
      setUploading(false);
    }
  };

  // Permission loading / denied states
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={me.brand} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Ionicons
            name='camera-outline'
            size={48}
            color={me.brand}
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            We need the camera to capture your selfie. Photos from your library
            aren&apos;t accepted at this step.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            accessibilityRole='button'
            accessibilityLabel='Allow camera access'
          >
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelLink}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
            accessibilityLabel='Cancel and go back'
          >
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Preview state — after capture, before upload
  if (previewUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.preview} />
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              uploading && styles.primaryButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={uploading}
            accessibilityRole='button'
            accessibilityLabel={
              uploading ? 'Uploading photo' : 'Use this photo'
            }
            accessibilityState={{ disabled: uploading }}
          >
            {uploading ? (
              <ActivityIndicator color={me.onBrand} />
            ) : (
              <Text style={styles.primaryButtonText}>Use Photo</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRetake}
            disabled={uploading}
            accessibilityRole='button'
            accessibilityLabel='Retake photo'
          >
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Live camera state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={styles.camera} facing='front' />
        <View pointerEvents='none' style={styles.ovalOverlay}>
          <View style={styles.oval} />
          <Text style={styles.overlayText}>
            Centre your face inside the oval
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          accessibilityRole='button'
          accessibilityLabel='Take selfie'
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SelfieCaptureScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.ink,
  },
  centered: {
    flex: 1,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrap: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  ovalOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oval: {
    width: 260,
    height: 340,
    borderRadius: 170,
    borderWidth: 4,
    borderColor: me.onBrand,
    backgroundColor: 'transparent',
    opacity: 0.85,
  },
  overlayText: {
    position: 'absolute',
    bottom: 48,
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
  },
  previewWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  preview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    backgroundColor: me.bg2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    paddingTop: 16,
    alignItems: 'center',
    backgroundColor: me.ink,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: me.onBrand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: me.onBrand,
  },
  cancelLink: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelLinkText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: me.brand,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minWidth: 200,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: me.bg2,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 15,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: me.ink,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});
