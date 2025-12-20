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
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { JobService } from '../services/JobService';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types';
import { JobsStackParamList } from '../navigation/types';
import { logger } from '../utils/logger';
import { theme } from '../theme';

type BidSubmissionScreenRouteProp = RouteProp<
  JobsStackParamList,
  'BidSubmission'
>;
type BidSubmissionScreenNavigationProp = StackNavigationProp<
  JobsStackParamList,
  'BidSubmission'
>;

interface Props {
  route: BidSubmissionScreenRouteProp;
  navigation: BidSubmissionScreenNavigationProp;
}

const BidSubmissionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    if (!user || user.role !== 'contractor') {
      Alert.alert('Error', 'Only contractors can submit bids');
      return;
    }

    if (!amount || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const bidAmount = parseFloat(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    setSubmitting(true);
    try {
      await JobService.submitBid({
        jobId,
        contractorId: user.id,
        amount: bidAmount,
        description,
      });

      Alert.alert('Success', 'Your bid has been submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit bid');
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Bid</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobDescription}>{job.description}</Text>
          <Text style={styles.jobLocation}>📍 {job.location}</Text>
          <Text style={styles.jobBudget}>Budget: ${job.budget}</Text>
        </View>

        <View style={styles.form}>
          <Input
            label='Your Bid Amount *'
            placeholder='Enter your bid amount'
            value={amount}
            onChangeText={setAmount}
            keyboardType='numeric'
            leftIcon='cash-outline'
            variant='outline'
            size='lg'
            fullWidth
          />

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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.info,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: theme.colors.textInverse,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textInverse,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  jobInfo: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 15,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: theme.colors.info,
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
  tipBox: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 5,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  submitButton: {
    height: 50,
    backgroundColor: theme.colors.info,
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
    fontWeight: 'bold',
  },
});

export default BidSubmissionScreen;
