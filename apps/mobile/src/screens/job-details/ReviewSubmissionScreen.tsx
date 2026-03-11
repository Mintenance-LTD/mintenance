/**
 * ReviewSubmissionScreen - Submit a review for a completed job
 *
 * Validates: rating 1-5, comment min 20 chars.
 * Uses POST /api/jobs/:id/review
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../../theme';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { HapticService } from '../../utils/haptics';
import { JobsStackParamList } from '../../navigation/types';

type ScreenRouteProp = RouteProp<JobsStackParamList, 'ReviewSubmission'>;
type ScreenNavigationProp = NativeStackNavigationProp<JobsStackParamList, 'ReviewSubmission'>;

interface Props {
  route: ScreenRouteProp;
  navigation: ScreenNavigationProp;
}

const MIN_COMMENT_LENGTH = 20;

export const ReviewSubmissionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, contractorName, jobTitle } = route.params;
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = rating >= 1 && rating <= 5 && comment.trim().length >= MIN_COMMENT_LENGTH;

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;

    setSubmitting(true);
    try {
      await mobileApiClient.post(`/api/jobs/${jobId}/review`, {
        rating,
        comment: comment.trim(),
      });
      HapticService.success();
      Alert.alert('Review Submitted', 'Thank you for your feedback!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      HapticService.error();
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isValid, jobId, rating, comment, navigation]);

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
        <Text style={styles.headerTitle}>Leave a Review</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Job Info */}
          {(jobTitle || contractorName) && (
            <View style={styles.jobInfoCard}>
              {jobTitle && <Text style={styles.jobTitle}>{jobTitle}</Text>}
              {contractorName && (
                <Text style={styles.contractorName}>For: {contractorName}</Text>
              )}
            </View>
          )}

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>How would you rate this job?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => { setRating(star); HapticService.selection(); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? theme.colors.warning : theme.colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Text>
            )}
          </View>

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.sectionLabel}>Write your review</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience with this job..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
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
              {comment.length}/500{comment.trim().length < MIN_COMMENT_LENGTH && comment.length > 0 ? ` · min ${MIN_COMMENT_LENGTH} chars required` : ''}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit review"
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={theme.colors.textInverse} />
              <Text style={styles.submitButtonText}>Submit Review</Text>
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
  flex: {
    flex: 1,
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
  headerTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
  },
  headerSpacer: {
    width: theme.spacing[10],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing[5],
  },
  jobInfoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  jobTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  contractorName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  starsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  starButton: {
    padding: theme.spacing.xs,
  },
  ratingLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  commentSection: {
    marginBottom: theme.spacing.lg,
  },
  commentInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
    textAlign: 'right',
  },
  charCountWarning: {
    color: theme.colors.warning,
  },
  charCountNearLimit: {
    color: theme.colors.error,
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
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.layout.buttonHeightLarge,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default ReviewSubmissionScreen;

