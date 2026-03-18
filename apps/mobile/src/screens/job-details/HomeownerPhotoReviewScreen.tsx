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
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { JobService } from '../../services/JobService';
import { PhotoUploadService } from '../../services/PhotoUploadService';
import type { JobsStackParamList } from '../../navigation/types';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';
import { styles } from './photoReviewStyles';
import { BeforeAfterSliderView } from './components/BeforeAfterSliderView';
import { PhotoReviewControls } from './components/PhotoReviewControls';

type PhotoReviewRouteProp = RouteProp<JobsStackParamList, 'PhotoReview'>;

interface PhotoPair {
  before: { url: string; id: string; timestamp?: string };
  after: { url: string; id: string; timestamp?: string };
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

      const [jobData, photos] = await Promise.all([
        JobService.getJobById(jobId),
        PhotoUploadService.getJobPhotos(jobId),
      ]);
      if (jobData?.title) setJobTitle(jobData.title);

      const beforePhotos = (photos || []).filter(
        (p) => p.photo_type === 'before'
      );
      const afterPhotos = (photos || []).filter(
        (p) => p.photo_type === 'after'
      );

      const pairs: PhotoPair[] = [];
      const pairCount = Math.min(beforePhotos.length, afterPhotos.length);
      for (let i = 0; i < pairCount; i++) {
        pairs.push({
          before: {
            url: beforePhotos[i].photo_url,
            id: beforePhotos[i].id,
            timestamp: beforePhotos[i].created_at,
          },
          after: {
            url: afterPhotos[i].photo_url,
            id: afterPhotos[i].id,
            timestamp: afterPhotos[i].created_at,
          },
        });
      }

      // Add unpaired after photos reusing the first before photo as context
      for (let i = pairCount; i < afterPhotos.length; i++) {
        if (beforePhotos.length > 0) {
          pairs.push({
            before: {
              url: beforePhotos[0].photo_url,
              id: beforePhotos[0].id,
              timestamp: beforePhotos[0].created_at,
            },
            after: {
              url: afterPhotos[i].photo_url,
              id: afterPhotos[i].id,
              timestamp: afterPhotos[i].created_at,
            },
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
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to approve. Please try again.';
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
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to submit. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelChanges = () => {
    setShowChangesForm(false);
    setChangesComment('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={theme.colors.textPrimary} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (photoPairs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole='button'
          >
            <Ionicons
              name='arrow-back'
              size={22}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Work</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name='images-outline'
              size={32}
              color={theme.colors.textTertiary}
            />
          </View>
          <Text style={styles.emptyTitle}>No Photos Available</Text>
          <Text style={styles.emptySubtitle}>
            Photos will appear here once the contractor uploads before and after
            photos.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
        >
          <Ionicons
            name='arrow-back'
            size={22}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Work</Text>
          {jobTitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {jobTitle}
            </Text>
          ) : null}
        </View>
        <Text style={styles.photoCount}>
          {activePairIndex + 1}/{photoPairs.length}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <BeforeAfterSliderView
          photoPairs={photoPairs}
          activePairIndex={activePairIndex}
          onSelectPair={setActivePairIndex}
        />

        {/* Changes Form (rendered inside scroll so it's above the keyboard) */}
        {showChangesForm && (
          <PhotoReviewControls
            showChangesForm
            changesComment={changesComment}
            submitting={submitting}
            onShowChangesForm={() => setShowChangesForm(true)}
            onCancelChanges={handleCancelChanges}
            onChangesCommentChange={setChangesComment}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
          />
        )}
      </ScrollView>

      {/* Action Buttons (fixed footer, hidden while changes form is open) */}
      {!showChangesForm && (
        <PhotoReviewControls
          showChangesForm={false}
          changesComment={changesComment}
          submitting={submitting}
          onShowChangesForm={() => setShowChangesForm(true)}
          onCancelChanges={handleCancelChanges}
          onChangesCommentChange={setChangesComment}
          onApprove={handleApprove}
          onRequestChanges={handleRequestChanges}
        />
      )}
    </SafeAreaView>
  );
};

export default HomeownerPhotoReviewScreen;
