/**
 * HomeownerPhotoReviewScreen
 *
 * Phase 9 of the job lifecycle: Homeowner reviews before/after photos
 * and approves or requests changes to completed work.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { BeforeAfterSlider } from '../../components/BeforeAfterSlider';
import type { JobsStackParamList } from '../../navigation/types';
import { logger } from '../../utils/logger';

type PhotoReviewRouteProp = RouteProp<JobsStackParamList, 'PhotoReview'>;

interface PhotoPair {
  before: { url: string; id: string };
  after: { url: string; id: string };
}

export const HomeownerPhotoReviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PhotoReviewRouteProp>();
  const { user } = useAuth();
  const { jobId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const [activePairIndex, setActivePairIndex] = useState(0);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesComment, setChangesComment] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch job title
      const { data: job } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', jobId)
        .single();

      if (job?.title) setJobTitle(job.title);

      // Fetch before and after photos
      const { data: photos, error } = await supabase
        .from('job_photos_metadata')
        .select('id, photo_url, photo_type, created_at')
        .eq('job_id', jobId)
        .in('photo_type', ['before', 'after'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Pair before and after photos
      const beforePhotos = (photos || []).filter(p => p.photo_type === 'before');
      const afterPhotos = (photos || []).filter(p => p.photo_type === 'after');

      const pairs: PhotoPair[] = [];
      const pairCount = Math.min(beforePhotos.length, afterPhotos.length);
      for (let i = 0; i < pairCount; i++) {
        pairs.push({
          before: { url: beforePhotos[i].photo_url, id: beforePhotos[i].id },
          after: { url: afterPhotos[i].photo_url, id: afterPhotos[i].id },
        });
      }

      // Also add unpaired after photos (useful if more after than before)
      for (let i = pairCount; i < afterPhotos.length; i++) {
        if (beforePhotos.length > 0) {
          pairs.push({
            before: { url: beforePhotos[0].photo_url, id: beforePhotos[0].id },
            after: { url: afterPhotos[i].photo_url, id: afterPhotos[i].id },
          });
        }
      }

      setPhotoPairs(pairs);
    } catch (err) {
      logger.error('Failed to fetch photos for review', err);
      Alert.alert('Error', 'Failed to load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleApprove = async () => {
    if (!user?.id || submitting) return;
    setSubmitting(true);

    try {
      await mobileApiClient.post(`/api/jobs/${jobId}/confirm-completion`, {});

      Alert.alert(
        'Work Approved',
        'Payment will be released to the contractor. Thank you!',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!user?.id || submitting || !changesComment.trim()) return;
    setSubmitting(true);

    try {
      await mobileApiClient.post(`/api/jobs/${jobId}/request-changes`, {
        comments: changesComment.trim(),
      });

      Alert.alert(
        'Changes Requested',
        'The contractor has been notified and will review your feedback.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (photoPairs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Work</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="images-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Photos Available</Text>
          <Text style={styles.emptySubtitle}>
            Photos will appear here once the contractor uploads before and after photos.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPair = photoPairs[activePairIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Work</Text>
          {jobTitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{jobTitle}</Text> : null}
        </View>
        <Text style={styles.photoCount}>
          {activePairIndex + 1}/{photoPairs.length}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Before/After Slider */}
        <View style={styles.sliderContainer}>
          <BeforeAfterSlider
            beforeUrl={currentPair.before.url}
            afterUrl={currentPair.after.url}
            height={320}
          />
        </View>

        {/* Photo Pair Thumbnails */}
        {photoPairs.length > 1 && (
          <ScrollView
            horizontal
            style={styles.thumbnailRow}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailContent}
          >
            {photoPairs.map((pair, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.thumbnail,
                  index === activePairIndex && styles.thumbnailActive,
                ]}
                onPress={() => setActivePairIndex(index)}
                accessibilityRole="button"
                accessibilityLabel={`Photo pair ${index + 1} of ${photoPairs.length}`}
              >
                <Text style={styles.thumbnailText}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.textTertiary} />
          <Text style={styles.instructionsText}>
            Drag the slider to compare before and after photos. Approve if satisfied, or request changes.
          </Text>
        </View>

        {/* Changes Form */}
        {showChangesForm && (
          <View style={styles.changesForm}>
            <Text style={styles.changesLabel}>What changes are needed?</Text>
            <TextInput
              style={styles.changesInput}
              value={changesComment}
              onChangeText={setChangesComment}
              placeholder="Describe what needs to be fixed or improved..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Changes needed description"
            />
            <View style={styles.changesActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowChangesForm(false);
                  setChangesComment('');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !changesComment.trim() && styles.buttonDisabled]}
                onPress={handleRequestChanges}
                disabled={!changesComment.trim() || submitting}
                accessibilityRole="button"
                accessibilityLabel="Submit change request"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Send to Contractor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {!showChangesForm && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.requestChangesButton}
            onPress={() => setShowChangesForm(true)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Request changes to the work"
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.requestChangesText}>Request Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.approveButton}
            onPress={handleApprove}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Approve the completed work"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                <Text style={styles.approveButtonText}>Approve Work</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  photoCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  sliderContainer: {
    paddingTop: 16,
  },
  thumbnailRow: {
    marginTop: 12,
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight || theme.colors.surfaceSecondary,
  },
  thumbnailText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  changesForm: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    ...theme.shadows.sm,
  },
  changesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  changesInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    minHeight: 100,
    backgroundColor: theme.colors.background,
  },
  changesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitButtonText: {
    fontSize: 15,
    color: theme.colors.white,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  requestChangesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    backgroundColor: theme.colors.surface,
  },
  requestChangesText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.white,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});

export default HomeownerPhotoReviewScreen;
