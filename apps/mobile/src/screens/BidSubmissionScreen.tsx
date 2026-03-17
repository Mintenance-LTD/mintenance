/**
 * BidSubmissionScreen — Redesigned to match web app features
 *
 * Includes: earnings breakdown, budget warning, min description length,
 * required duration & start date, platform fee transparency.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { JobService } from '../services/JobService';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '@mintenance/types';
import { JobsStackParamList } from '../navigation/types';
import { logger } from '../utils/logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DatePicker } from '../components/ui/DatePicker';
import { theme } from '../theme';

type BidSubmissionScreenRouteProp = RouteProp<JobsStackParamList, 'BidSubmission'>;
type BidSubmissionScreenNavigationProp = NativeStackNavigationProp<JobsStackParamList, 'BidSubmission'>;

interface Props {
  route: BidSubmissionScreenRouteProp;
  navigation: BidSubmissionScreenNavigationProp;
}

const PLATFORM_FEE_PERCENT = 5;
const MIN_DESCRIPTION_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 5000;

const BidSubmissionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [proposedStartDate, setProposedStartDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const jobData = await JobService.getJobById(jobId);
      setJob(jobData);
    } catch (error) {
      logger.error('Failed to load job:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const bidAmount = parseFloat(amount) || 0;
  const platformFee = bidAmount * (PLATFORM_FEE_PERCENT / 100);
  const yourEarnings = bidAmount - platformFee;
  const isOverBudget = job?.budget != null && bidAmount > job.budget;
  const descriptionTooShort = description.trim().length > 0 && description.trim().length < MIN_DESCRIPTION_LENGTH;

  const isValid =
    bidAmount > 0 &&
    description.trim().length >= MIN_DESCRIPTION_LENGTH &&
    estimatedDuration.trim().length > 0 &&
    parseInt(estimatedDuration, 10) > 0 &&
    proposedStartDate !== null;

  const handleSubmit = async () => {
    setFormError(null);

    if (!user || user.role !== 'contractor') {
      setFormError('Only contractors can submit bids');
      return;
    }
    if (bidAmount <= 0) {
      setFormError('Please enter a valid bid amount');
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      setFormError(`Proposal must be at least ${MIN_DESCRIPTION_LENGTH} characters`);
      return;
    }
    if (!estimatedDuration || parseInt(estimatedDuration, 10) <= 0) {
      setFormError('Please enter an estimated duration');
      return;
    }
    if (!proposedStartDate) {
      setFormError('Please select a proposed start date');
      return;
    }

    setSubmitting(true);
    try {
      await JobService.submitBid({
        jobId,
        contractorId: user.id,
        amount: bidAmount,
        description: description.trim(),
        estimatedDurationDays: parseInt(estimatedDuration, 10),
        proposedStartDate: proposedStartDate.toISOString().split('T')[0],
      });
      Alert.alert('Success', 'Your bid has been submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to submit bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: theme.colors.textSecondary }}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: theme.colors.textSecondary }}>Job not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Bid</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Job Info Card */}
          <View style={styles.jobCard}>
            <View style={styles.jobIconWrap}>
              <Ionicons name="briefcase-outline" size={22} color="#3B82F6" />
            </View>
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobDescription} numberOfLines={2}>{job.description}</Text>
              {job.location && typeof job.location === 'string' && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
                  <Text style={styles.locationText}>{job.location}</Text>
                </View>
              )}
              {job.budget != null && (
                <View style={styles.budgetBadge}>
                  <Text style={styles.budgetText}>Budget: {'\u00A3'}{job.budget.toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {/* Bid Amount */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Your Bid Amount *</Text>
              <View style={styles.currencyRow}>
                <View style={styles.currencyPrefix}>
                  <Text style={styles.currencySymbol}>{'\u00A3'}</Text>
                </View>
                <TextInput
                  style={styles.currencyInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="e.g. 250"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Budget Warning */}
            {isOverBudget && (
              <View style={styles.warningBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.warningText}>
                  Your bid exceeds the budget by {'\u00A3'}{(bidAmount - (job.budget || 0)).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Earnings Breakdown */}
            {bidAmount > 0 && (
              <View style={styles.earningsCard}>
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Your bid</Text>
                  <Text style={styles.earningsValue}>{'\u00A3'}{bidAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Platform fee ({PLATFORM_FEE_PERCENT}%)</Text>
                  <Text style={[styles.earningsValue, { color: theme.colors.error }]}>-{'\u00A3'}{platformFee.toFixed(2)}</Text>
                </View>
                <View style={styles.earningsDivider} />
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsTotalLabel}>You earn</Text>
                  <Text style={styles.earningsTotalValue}>{'\u00A3'}{yourEarnings.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* Proposal Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Proposal Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your approach, timeline, and why you're the right contractor for this job..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <View style={styles.charCountRow}>
                <Text style={[
                  styles.charCount,
                  descriptionTooShort && styles.charCountError,
                ]}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                  {descriptionTooShort && ` (min ${MIN_DESCRIPTION_LENGTH})`}
                </Text>
              </View>
            </View>

            {/* Duration & Start Date */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.label}>Duration (days) *</Text>
                <TextInput
                  style={styles.input}
                  value={estimatedDuration}
                  onChangeText={setEstimatedDuration}
                  placeholder="e.g. 3"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rowSpacer} />
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.label}>Start Date *</Text>
                <DatePicker
                  label="Select date"
                  value={proposedStartDate}
                  onChange={setProposedStartDate}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
              <Text style={styles.tipsTitle}>Bidding Tips</Text>
            </View>
            <Text style={styles.tipItem}>{'\u2022'} Be competitive but fair with your pricing</Text>
            <Text style={styles.tipItem}>{'\u2022'} Include your timeline and availability</Text>
            <Text style={styles.tipItem}>{'\u2022'} Mention relevant experience or certifications</Text>
            <Text style={styles.tipItem}>{'\u2022'} Be professional and detailed in your proposal</Text>
          </View>

          {/* Error Banner */}
          {formError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit bid"
        >
          <Ionicons name="send-outline" size={18} color={theme.colors.textInverse} />
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Bid'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  content: { padding: 16, paddingBottom: 32 },

  // Job card
  jobCard: {
    flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  jobIconWrap: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  jobInfo: { flex: 1 },
  jobTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  jobDescription: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationText: { fontSize: 13, color: theme.colors.textTertiary },
  budgetBadge: {
    alignSelf: 'flex-start', backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  budgetText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },

  // Form
  formCard: {
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: theme.colors.textPrimary,
  },
  textArea: { minHeight: 120, paddingTop: 14 },
  row: { flexDirection: 'row' },
  rowSpacer: { width: 12 },

  // Currency input
  currencyRow: { flexDirection: 'row', alignItems: 'stretch' },
  currencyPrefix: {
    backgroundColor: theme.colors.backgroundTertiary, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  currencySymbol: { fontSize: 18, fontWeight: '700', color: theme.colors.textSecondary },
  currencyInput: {
    flex: 1, backgroundColor: theme.colors.backgroundSecondary,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 18, fontWeight: '600',
    color: theme.colors.textPrimary,
  },

  // Earnings breakdown
  earningsCard: {
    backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 16,
  },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  earningsLabel: { fontSize: 14, color: theme.colors.textSecondary },
  earningsValue: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  earningsDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: 8,
  },
  earningsTotalLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  earningsTotalValue: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },

  // Warning
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  warningText: { flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' },

  // Char count
  charCountRow: { alignItems: 'flex-end', marginTop: 4 },
  charCount: { fontSize: 12, color: theme.colors.textTertiary },
  charCountError: { color: theme.colors.error },

  // Tips
  tipsCard: {
    backgroundColor: '#FEF9E7', borderRadius: 16, padding: 16, marginBottom: 16,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  tipItem: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22, paddingLeft: 4 },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border,
  },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.textPrimary, borderRadius: 28, paddingVertical: 16,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: theme.colors.textInverse, fontSize: 17, fontWeight: '600' },
});

export default BidSubmissionScreen;
