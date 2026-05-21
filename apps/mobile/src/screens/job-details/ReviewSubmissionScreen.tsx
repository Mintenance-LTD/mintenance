/**
 * ReviewSubmissionScreen — Mint Editorial polish per the homeowner
 * "Leave a review" deck variant.
 *
 * Visual upgrades only — no change to the validation or POST flow.
 *   - Paper background, minimal back nav.
 *   - Inline Mint Editorial header (eyebrow + serif "Leave a review").
 *   - Job info rendered as a clean caption row above the star pad.
 *   - Star pad gets more breathing room and a mint-brand fill on
 *     selection (was the warm `me.accent` previously, which is the
 *     "sparingly" token).
 *   - Submit button uses the brand fill to match the editorial CTA
 *     pattern (was `me.ink` — too heavy for a review submission).
 *
 * POST `/api/jobs/:id/review` with `{ rating, comment }`. Validation:
 * rating 1–5, comment ≥ 20 chars. Unchanged.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { HapticService } from '../../utils/haptics';
import { JobsStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

type ScreenRouteProp = RouteProp<JobsStackParamList, 'ReviewSubmission'>;
type ScreenNavigationProp = NativeStackNavigationProp<
  JobsStackParamList,
  'ReviewSubmission'
>;

interface Props {
  route: ScreenRouteProp;
  navigation: ScreenNavigationProp;
}

const MIN_COMMENT_LENGTH = 20;

// Labels match the deck's adjective ladder.
const RATING_LABELS: readonly string[] = [
  '',
  'Poor',
  'Fair',
  'Good',
  'Very good',
  'Excellent',
];

export const ReviewSubmissionScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { jobId, contractorName, jobTitle } = route.params;
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    rating >= 1 && rating <= 5 && comment.trim().length >= MIN_COMMENT_LENGTH;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await mobileApiClient.post(`/api/jobs/${jobId}/review`, {
        rating,
        comment: comment.trim(),
      });
      HapticService.success();
      Alert.alert('Review submitted', 'Thank you for your feedback!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      HapticService.error();
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Failed to submit review. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [isValid, jobId, rating, comment, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg} />

      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.screenHeader}>
            <Text style={styles.eyebrow}>Review</Text>
            <Text style={styles.headline}>Leave a review</Text>
            {(jobTitle || contractorName) && (
              <Text style={styles.sub}>
                {jobTitle ? jobTitle : 'Your completed job'}
                {contractorName ? ` · ${contractorName}` : ''}
              </Text>
            )}
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>
              How would you rate this job?
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const selected = star <= rating;
                return (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      setRating(star);
                      HapticService.selection();
                    }}
                    accessibilityRole='button'
                    accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                    style={styles.starButton}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Ionicons
                      name={selected ? 'star' : 'star-outline'}
                      size={44}
                      color={selected ? me.brand : me.ink4}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {rating > 0 ? (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            ) : (
              <Text style={styles.ratingHint}>Tap to rate</Text>
            )}
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.sectionLabel}>What stood out?</Text>
            <TextInput
              style={styles.commentInput}
              placeholder='Was the work tidy? On time? Were they easy to deal with? A short paragraph helps other homeowners.'
              placeholderTextColor={me.ink4}
              multiline
              numberOfLines={6}
              textAlignVertical='top'
              value={comment}
              onChangeText={setComment}
              maxLength={500}
            />
            <Text
              style={[
                styles.charCount,
                comment.trim().length < MIN_COMMENT_LENGTH && comment.length > 0
                  ? styles.charCountWarning
                  : comment.length > 490
                    ? styles.charCountNearLimit
                    : null,
              ]}
            >
              {comment.length}/500
              {comment.trim().length < MIN_COMMENT_LENGTH && comment.length > 0
                ? ` · min ${MIN_COMMENT_LENGTH} chars required`
                : ''}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isValid || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          accessibilityRole='button'
          accessibilityLabel='Submit review'
        >
          {submitting ? (
            <ActivityIndicator color={me.onBrand} />
          ) : (
            <>
              <Ionicons name='checkmark-circle' size={20} color={me.onBrand} />
              <Text style={styles.submitButtonText}>Submit review</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  flex: { flex: 1 },
  topNav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  screenHeader: { marginTop: 6, marginBottom: 24 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 14,
    color: me.ink3,
    marginTop: 6,
    lineHeight: 19,
  },
  ratingSection: {
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: me.ink2,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  starsRow: { flexDirection: 'row', gap: 6 },
  starButton: { paddingHorizontal: 2, paddingVertical: 4 },
  ratingLabel: {
    fontFamily: me.font.display,
    fontSize: 18,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginTop: 14,
  },
  ratingHint: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 14,
  },
  commentSection: {
    backgroundColor: me.surface,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  commentInput: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: me.ink,
    minHeight: 140,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: me.line2,
  },
  charCount: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 8,
    textAlign: 'right',
  },
  charCountWarning: { color: me.warnFg },
  charCountNearLimit: { color: me.errFg },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: me.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    ...me.shadow.pop,
  },
  submitButton: {
    backgroundColor: me.brand,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
});
