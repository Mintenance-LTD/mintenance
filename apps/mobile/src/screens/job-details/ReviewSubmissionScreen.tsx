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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  jobInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contractorName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginTop: 8,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: 16,
    fontSize: 15,
    color: theme.colors.textPrimary,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 8,
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.large,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReviewSubmissionScreen;

