import { useMintDialog } from '../../components/shared/useMintDialog';
/**
 * HomeownerPhotoReviewScreen
 *
 * Phase 9 of the job lifecycle: Homeowner reviews before/after photos
 * and approves or requests changes to completed work.
 *
 * 2026-07-02 P1-9: this is the CANONICAL (and only) homeowner
 * completion-review surface, registered as the `PhotoReview` route.
 * The former duplicate, JobSignOffScreen (`JobSignOff` route), was a
 * text-only approve UX that bypassed photo evidence; audit-52
 * (2026-05-26) demoted it to a redirect stub and it has now been
 * deleted along with its route. All entry points (JobDetails sticky
 * CTA, JobQuickActions sign-off, deep link `jobs/:jobId/photos`)
 * land here. Do not re-introduce a parallel sign-off screen.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { JobService } from '../../services/JobService';
import { PhotoUploadService } from '../../services/PhotoUploadService';
import type { JobsStackParamList } from '../../navigation/types';
import { goBackSafe } from '../../navigation/hooks';
import { logger } from '../../utils/logger';
import { me } from '../../design-system/mint-editorial';
import { styles } from './photoReviewStyles';
import { BeforeAfterSliderView } from './components/BeforeAfterSliderView';
import { PhotoReviewControls } from './components/PhotoReviewControls';

type PhotoReviewRouteProp = RouteProp<JobsStackParamList, 'PhotoReview'>;

interface PhotoPair {
  before: { url: string; id: string; timestamp?: string };
  after: { url: string; id: string; timestamp?: string };
}

/** Days the homeowner has to approve before automatic eligibility checks begin. */
const AUTO_RELEASE_WINDOW_DAYS = 7;

// 2026-05-28 U3: mirror of web computeAutoReleaseInfo (audit-P2-4). The
// 7-day review window runs from jobs.completed_at (stamped when
// the after-photo upload auto-flips the job to 'completed'). Surfacing
// the deadline reassures homeowners that funds move even with no action.
function computeAutoReleaseInfo(completedAt: string | null | undefined): {
  deadline: Date;
  daysRemaining: number;
  passed: boolean;
} | null {
  if (!completedAt) return null;
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return null;
  const deadline = new Date(completed);
  deadline.setUTCDate(deadline.getUTCDate() + AUTO_RELEASE_WINDOW_DAYS);
  const msRemaining = deadline.getTime() - Date.now();
  // Ceil so "23 hours left" reads as "1 day" not "0 days".
  const daysRemaining = Math.max(
    0,
    Math.ceil(msRemaining / (24 * 60 * 60 * 1000))
  );
  return { deadline, daysRemaining, passed: msRemaining <= 0 };
}

function formatDeadline(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const HomeownerPhotoReviewScreen: React.FC = () => {
  const { alert, dialog } = useMintDialog();
  const navigation = useNavigation();
  const route = useRoute<PhotoReviewRouteProp>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { jobId } = route.params;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const [activePairIndex, setActivePairIndex] = useState(0);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesComment, setChangesComment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const approvalInFlight = useRef(false);
  const reworkRequests = useRef(new Map<string, string>());
  const reworkInFlight = useRef(false);
  const autoRelease = computeAutoReleaseInfo(completedAt);

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [jobData, photos] = await Promise.all([
        JobService.getJobById(jobId),
        PhotoUploadService.getJobPhotos(jobId),
      ]);
      if (jobData?.title) setJobTitle(jobData.title);
      setCompletedAt(jobData?.completed_at ?? null);
      setApproved(
        (jobData as { completion_confirmed_by_homeowner?: boolean } | null)
          ?.completion_confirmed_by_homeowner === true
      );

      const beforePhotos = (photos || []).filter(
        (p) => p.photo_type === 'before'
      );
      const afterPhotos = (photos || []).filter(
        (p) => p.photo_type === 'after'
      );

      const pairs: PhotoPair[] = [];
      const pairCount = Math.min(beforePhotos.length, afterPhotos.length);
      for (let i = 0; i < pairCount; i++) {
        const bp = beforePhotos[i];
        const ap = afterPhotos[i];
        if (!bp || !ap) continue;
        pairs.push({
          before: {
            url: bp.photo_url,
            id: bp.id,
            timestamp: bp.created_at,
          },
          after: {
            url: ap.photo_url,
            id: ap.id,
            timestamp: ap.created_at,
          },
        });
      }

      // Add unpaired after photos reusing the first before photo as context
      const firstBefore = beforePhotos[0];
      for (let i = pairCount; i < afterPhotos.length; i++) {
        const ap = afterPhotos[i];
        if (firstBefore && ap) {
          pairs.push({
            before: {
              url: firstBefore.photo_url,
              id: firstBefore.id,
              timestamp: firstBefore.created_at,
            },
            after: {
              url: ap.photo_url,
              id: ap.id,
              timestamp: ap.created_at,
            },
          });
        }
      }

      setPhotoPairs(pairs);
      setActivePairIndex(0);
    } catch (err) {
      logger.error('Failed to fetch photos for review', err);
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Unable to load the review. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleApprove = async () => {
    if (!user?.id || submitting || approved || approvalInFlight.current) return;
    if (!completedAt) {
      alert(
        'Refresh required',
        'The completion details are unavailable. Reload the review before approving work.',
        [{ text: 'Reload review', onPress: fetchPhotos }]
      );
      return;
    }
    approvalInFlight.current = true;
    setSubmitting(true);
    try {
      const result = await mobileApiClient.post<{ success: boolean }>(
        `/api/jobs/${jobId}/confirm-completion`,
        { completedAt }
      );
      if (result?.success !== true)
        throw new Error('Unable to confirm approval. Please retry.');
      setApproved(true);
      setShowChangesForm(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      alert(
        'Work Approved',
        'Work approved. Payment release is subject to the cooling-off period and final checks.',
        [{ text: 'Done', onPress: () => goBackSafe(navigation, 'JobsList') }]
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to approve. Please try again.';
      alert('Error', msg);
    } finally {
      approvalInFlight.current = false;
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (approved || approvalInFlight.current) return;
    if (!completedAt) {
      alert(
        'Refresh required',
        'The completion details are unavailable. Reload the review before requesting changes.',
        [{ text: 'Reload review', onPress: fetchPhotos }]
      );
      return;
    }
    if (
      !user?.id ||
      submitting ||
      reworkInFlight.current ||
      !changesComment.trim()
    )
      return;
    reworkInFlight.current = true;
    setSubmitting(true);
    try {
      const identity = JSON.stringify([
        user.id,
        jobId,
        completedAt,
        changesComment.trim(),
      ]);
      let requestKey = reworkRequests.current.get(identity);
      if (!requestKey) {
        // Hermes does not expose crypto.randomUUID. This is an operation
        // identifier, not a credential; the server binds it to actor and job.
        requestKey = `rework:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
        reworkRequests.current.set(identity, requestKey);
      }
      const result = await mobileApiClient.post<{ success: boolean }>(
        `/api/jobs/${jobId}/request-changes`,
        { comments: changesComment.trim(), completedAt },
        { headers: { 'Idempotency-Key': requestKey } }
      );
      if (result?.success !== true) {
        throw new Error('Unable to confirm the change request. Please retry.');
      }
      alert(
        'Changes Requested',
        'The job has reopened and the contractor has been notified. Payment approval is on hold. Agree a return visit in Messages if needed; sending this request does not change the agreed price.',
        [{ text: 'Done', onPress: () => goBackSafe(navigation, 'JobsList') }]
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to submit. Please try again.';
      alert('Error', msg);
    } finally {
      reworkInFlight.current = false;
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
          <ActivityIndicator size='large' color={me.ink} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || photoPairs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => goBackSafe(navigation, 'JobsList')}
            accessibilityRole='button'
          >
            <Ionicons name='arrow-back' size={22} color={me.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Work</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name='images-outline' size={32} color={me.ink3} />
          </View>
          <Text style={styles.emptyTitle}>
            {loadError ? 'Could not load work photos' : 'No Photos Available'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {loadError ??
              'Photos will appear here once the contractor uploads before and after photos.'}
          </Text>
          <TouchableOpacity
            onPress={fetchPhotos}
            accessibilityRole='button'
            style={{ padding: 16 }}
          >
            <Text style={{ color: me.brand }}>Retry loading photos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {dialog}
      <StatusBar barStyle='dark-content' backgroundColor={me.bg2} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => goBackSafe(navigation, 'JobsList')}
          accessibilityRole='button'
        >
          <Ionicons name='arrow-back' size={22} color={me.ink} />
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
          onRetry={fetchPhotos}
          approved={approved}
        />

        {approved && (
          <View
            style={[
              styles.autoReleaseBanner,
              { backgroundColor: me.bg2, borderColor: me.brand },
            ]}
            accessibilityRole='summary'
          >
            <Ionicons name='checkmark-circle' size={28} color={me.brand} />
            <View style={styles.autoReleaseTextWrap}>
              <Text style={styles.autoReleaseTitle}>Work approved</Text>
              <Text style={styles.autoReleaseBody}>
                Your approval is recorded. No further approval is needed.
                Payment becomes eligible for release after the 48-hour
                cooling-off period and final checks. Bank arrival takes
                additional time. For a problem after approval, contact support.
              </Text>
            </View>
          </View>
        )}

        {/* Auto-release countdown — only while awaiting homeowner action. */}
        {!approved &&
          !showChangesForm &&
          autoRelease &&
          (() => {
            const isUrgent =
              autoRelease.passed || autoRelease.daysRemaining <= 2;
            return (
              <View
                accessibilityRole='alert'
                style={[
                  styles.autoReleaseBanner,
                  {
                    backgroundColor: isUrgent ? me.warnBg : me.infoBg,
                    borderColor: isUrgent ? me.warnFg : me.infoFg,
                  },
                ]}
              >
                <Ionicons
                  name='time-outline'
                  size={20}
                  color={isUrgent ? me.warnFg : me.infoFg}
                  style={styles.autoReleaseIcon}
                />
                <View style={styles.autoReleaseTextWrap}>
                  <Text
                    style={[
                      styles.autoReleaseTitle,
                      { color: isUrgent ? me.warnFg : me.infoFg },
                    ]}
                  >
                    {autoRelease.passed
                      ? 'Review window ended'
                      : autoRelease.daysRemaining === 1
                        ? '1 day left to approve or request changes'
                        : `${autoRelease.daysRemaining} days left to approve or request changes`}
                  </Text>
                  <Text
                    style={[
                      styles.autoReleaseBody,
                      { color: isUrgent ? me.warnFg : me.infoFg },
                    ]}
                  >
                    {autoRelease.passed
                      ? `The ${AUTO_RELEASE_WINDOW_DAYS}-day review window has passed (${formatDeadline(autoRelease.deadline)}). Automatic review and payment checks apply before release.`
                      : `Please review by ${formatDeadline(autoRelease.deadline)}. If you take no action, automatic review applies. Release remains subject to payment checks and any active dispute.`}
                  </Text>
                </View>
              </View>
            );
          })()}

        {/* Changes Form (rendered inside scroll so it's above the keyboard) */}
        {!approved && showChangesForm && (
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
      {!approved && !showChangesForm && (
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
