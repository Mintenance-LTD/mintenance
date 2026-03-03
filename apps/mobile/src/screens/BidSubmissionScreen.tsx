import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
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
import { theme } from '../theme';
import { DatePicker } from '../components/ui/DatePicker';

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
      setFormError(error.message || 'Failed to submit bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Job not found</Text>
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
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole='header'>Submit Bid</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobDescription}>{job.description}</Text>
          <Text style={styles.jobLocation}>📍 {job.location}</Text>
          <Text style={styles.jobBudget}>Budget: {'\u00A3'}{job.budget}</Text>
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
                  ⚠️ Your bid (£{parsed.toLocaleString()}) is significantly above the budget
                  {budgetMax ? ` (£${budgetMax.toLocaleString()})` : ''}
                </Text>
              );
            }
            if (budgetMin && parsed < budgetMin * 0.5) {
              return (
                <Text style={styles.bidWarning}>
                  ⚠️ Your bid (£{parsed.toLocaleString()}) is much lower than the minimum budget
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
            <Text style={styles.tipTitle}>💡 Bidding Tips:</Text>
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
    backgroundColor: theme.colors.surfaceSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  jobInfo: {
    backgroundColor: '#F7F7F7',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  jobDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    lineHeight: 22,
  },
  jobLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  jobBudget: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  form: {
    backgroundColor: theme.colors.surface,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: 15,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
  },
  textArea: {
    height: 150,
    paddingTop: 15,
  },
  bidHint: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: -4,
    marginBottom: 8,
  },
  bidWarning: {
    fontSize: 12,
    color: theme.colors.warning,
    marginTop: -4,
    marginBottom: 8,
  },
  tipBox: {
    backgroundColor: '#F7F7F7',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#717171',
    marginBottom: 5,
  },
  footer: {
    padding: 24,
    backgroundColor: theme.colors.surface,
  },
  submitButton: {
    height: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BidSubmissionScreen;

