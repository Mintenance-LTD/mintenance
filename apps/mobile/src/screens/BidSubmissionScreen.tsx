import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Input } from '../components/ui/Input';
import { Banner } from '../components/ui/Banner';
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

type BidSubmissionScreenRouteProp = RouteProp<
  JobsStackParamList,
  'BidSubmission'
>;
type BidSubmissionScreenNavigationProp = NativeStackNavigationProp<JobsStackParamList, 'BidSubmission'>;

interface Props {
  route: BidSubmissionScreenRouteProp;
  navigation: BidSubmissionScreenNavigationProp;
}

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

  const handleSubmit = async () => {
    setFormError(null);

    if (!user || user.role !== 'contractor') {
      setFormError('Only contractors can submit bids');
      return;
    }

    if (!amount || !description) {
      setFormError('Please fill in all required fields');
      return;
    }

    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      setFormError('Please enter a valid bid amount');
      return;
    }

    setSubmitting(true);
    try {
      await JobService.submitBid({
        jobId,
        contractorId: user.id,
        amount: bidAmount,
        description,
        estimatedDurationDays: estimatedDuration ? parseInt(estimatedDuration, 10) : undefined,
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
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole='header'>Submit Bid</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.jobInfo}>
          <View style={styles.jobIconWrap}>
            <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
          </View>
          <View style={styles.jobInfoContent}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobDescription}>{job.description}</Text>
            <View style={styles.jobMetaRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.jobLocation}>{typeof job.location === 'string' ? job.location : JSON.stringify(job.location)}</Text>
            </View>
            <View style={styles.budgetChip}>
              <Text style={styles.jobBudget}>Budget: {'\u00A3'}{job.budget}</Text>
            </View>
          </View>
        </View>

        <View style={styles.form}>
          <Banner message={formError ?? ''} variant="error" />
          <Input
            label='Your Bid Amount (£) *'
            placeholder='e.g. 250'
            value={amount}
            onChangeText={setAmount}
            keyboardType='numeric'
            leftIcon='cash-outline'
            variant='outline'
            size='lg'
            fullWidth
          />
          {(() => {
            const parsed = parseFloat(amount);
            const budgetMax = job.budget_max ?? job.budget;
            const budgetMin = job.budget_min;
            if (!amount || isNaN(parsed)) return null;
            if (budgetMax && parsed > budgetMax * 1.5) {
              return (
                <Text style={styles.bidWarning}>
                  Your bid (£{parsed.toLocaleString()}) is significantly above the budget
                  {budgetMax ? ` (£${budgetMax.toLocaleString()})` : ''}
                </Text>
              );
            }
            if (budgetMin && parsed < budgetMin * 0.5) {
              return (
                <Text style={styles.bidWarning}>
                  Your bid (£{parsed.toLocaleString()}) is much lower than the minimum budget
                  (£{budgetMin.toLocaleString()})
                </Text>
              );
            }
            return (
              <Text style={styles.bidHint}>
                £{parsed.toLocaleString()} bid
                {budgetMax ? ` · Budget up to £${budgetMax.toLocaleString()}` : ''}
              </Text>
            );
          })()}

          <Input
            label='Proposal Description *'
            placeholder="Describe your approach, timeline, and why you're the right contractor for this job..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            maxLength={1000}
            leftIcon='document-text-outline'
            variant='outline'
            size='lg'
            fullWidth
          />

          <Input
            label='Estimated Duration (days)'
            placeholder='e.g. 3'
            value={estimatedDuration}
            onChangeText={setEstimatedDuration}
            keyboardType='numeric'
            leftIcon='time-outline'
            variant='outline'
            size='lg'
            fullWidth
          />

          <DatePicker
            label='Proposed Start Date'
            value={proposedStartDate}
            onChange={setProposedStartDate}
            minimumDate={new Date()}
          />

          <View style={styles.tipBox}>
            <View style={styles.tipHeader}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="bulb-outline" size={16} color={theme.colors.accent} />
              </View>
              <Text style={styles.tipTitle}>Bidding Tips</Text>
            </View>
            <Text style={styles.tipText}>
              • Be competitive but fair with your pricing
            </Text>
            <Text style={styles.tipText}>
              • Include your timeline and availability
            </Text>
            <Text style={styles.tipText}>
              • Mention relevant experience or certifications
            </Text>
            <Text style={styles.tipText}>
              • Be professional and detailed in your proposal
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole='button'
          accessibilityLabel={submitting ? 'Submitting bid' : 'Submit bid'}
          accessibilityState={{ disabled: submitting }}
        >
          <Ionicons name="send-outline" size={18} color={theme.colors.textInverse} style={{ marginRight: 8 }} />
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Bid'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  jobInfo: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  jobIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobInfoContent: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  jobDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  jobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  jobLocation: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  budgetChip: {
    backgroundColor: theme.colors.primaryLight,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  jobBudget: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  form: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  bidHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: -4,
    marginBottom: 8,
  },
  bidWarning: {
    fontSize: 12,
    color: theme.colors.accent,
    marginTop: -4,
    marginBottom: 8,
  },
  tipBox: {
    backgroundColor: theme.colors.accentLight,
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    height: 52,
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BidSubmissionScreen;
