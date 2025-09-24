import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AIAnalysisService, AIAnalysis } from '../services/AIAnalysisService';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types';
import { JobsStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';
import { useJob } from '../hooks/useJobs';
import { JobStatusTracker } from '../components/JobStatusTracker';
import { ContractorAssignment } from '../components/ContractorAssignment';
import { theme } from '../theme';

type JobDetailsScreenRouteProp = RouteProp<JobsStackParamList, 'JobDetails'>;
type JobDetailsScreenNavigationProp = StackNavigationProp<
  JobsStackParamList,
  'JobDetails'
>;

interface Props {
  route: JobDetailsScreenRouteProp;
  navigation: JobDetailsScreenNavigationProp;
}

const JobDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { user } = useAuth();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Use React Query hooks
  const {
    data: job,
    isLoading: jobLoading,
    error: jobError,
    refetch: refetchJob,
  } = useJob(jobId);
  // Bids not used in this screen currently

  // Load AI analysis when job data is available
  useEffect(() => {
    if (user?.role === 'contractor' && job?.photos && job.photos.length > 0) {
      loadAIAnalysis(job);
    }
  }, [user, job]);

  const loadAIAnalysis = async (jobData: Job) => {
    try {
      setAiLoading(true);
      const analysis = await AIAnalysisService.analyzeJobPhotos(jobData);
      setAiAnalysis(analysis);
    } catch (error) {
      logger.error('Failed to load AI analysis:', error);
      // Don't show error to user - AI analysis is optional
    } finally {
      setAiLoading(false);
    }
  };

  const handleContractorAssigned = (contractorId: string, bidId: string) => {
    logger.info('Contractor assigned to job', { jobId, contractorId, bidId });
    // Refetch job data to get updated status
    refetchJob();
  };

  const handleJobStatusUpdate = (updatedJob: Job) => {
    logger.info('Job status updated', { jobId, status: updatedJob.status });
    // Refetch to get fresh data
    refetchJob();
  };

  // const handleAcceptBid = (bidId: string) => {
  //   logger.info('Accept bid pressed', { jobId, bidId });
  //   Alert.alert('Bid', 'Accept bid action');
  // };

  /* const renderBidCard = ({ item: bid }: { item: Bid }) => {
    const isAccepted = bid.status === 'accepted';
    const isPending = bid.status === 'pending';
    const daysAgo = Math.floor(
      (new Date().getTime() - new Date(bid.createdAt).getTime()) /
        (1000 * 3600 * 24)
    );

    return (
      <View style={[styles.bidCard, isAccepted && styles.acceptedBidCard]}>
        <View style={styles.bidHeader}>
          <View style={styles.contractorInfo}>
            <View style={styles.contractorAvatar}>
              <Ionicons name='person' size={20} color={theme.colors.info} />
            </View>
            <View>
              <Text style={styles.contractorName}>
                {bid.contractorName || 'Anonymous Contractor'}
              </Text>
              <View style={styles.bidMeta}>
                <Ionicons name='star' size={12} color='#FFD700' />
                <Text style={styles.contractorRating}>4.8 (127 reviews)</Text>
                <Text style={styles.bidDate}>
                  {' '}
                  • {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.bidAmountContainer}>
            <Text style={styles.bidAmount}>${bid.amount.toLocaleString()}</Text>
            {isAccepted && (
              <View style={styles.acceptedBadge}>
                <Ionicons name='checkmark-circle' size={16} color='#34C759' />
                <Text style={styles.acceptedText}>Hired</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.bidDescription}>{bid.description}</Text>

        <View style={styles.bidFooter}>
          <View style={styles.bidActions}>
            {user?.role === 'homeowner' &&
              job?.status === 'posted' &&
              isPending && (
                <>
                  <TouchableOpacity style={styles.messageButton}>
                    <Ionicons
                      name='chatbubble-outline'
                      size={16}
                      color={theme.colors.info}
                    />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptBid(bid.id)}
                  >
                    <Ionicons name='checkmark-outline' size={16} color={theme.colors.white} />
                    <Text style={styles.acceptButtonText}>Accept Bid</Text>
                  </TouchableOpacity>
                </>
              )}

            {bid.status === 'rejected' && (
              <View style={styles.rejectedBadge}>
                <Ionicons name='close-circle' size={16} color='#FF3B30' />
                <Text style={styles.rejectedText}>Not selected</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }; */

  /* const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  }; */

  /* const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return theme.colors.info;
      case 'assigned':
        return '#5856D6';
      case 'in_progress':
        return '#FF9500';
      case 'completed':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  }; */

  /* const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'posted':
        return 'radio-button-on';
      case 'assigned':
        return 'person-add';
      case 'in_progress':
        return 'hammer';
      case 'completed':
        return 'checkmark-circle';
      default:
        return 'help-circle';
    }
  }; */

  /* const formatJobStatus = (status: string) => {
    switch (status) {
      case 'posted':
        return 'Open for Bids';
      case 'assigned':
        return 'Contractor Assigned';
      case 'in_progress':
        return 'Work in Progress';
      case 'completed':
        return 'Job Completed';
      default:
        return status;
    }
  }; */

  // Loading state
  if (jobLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  // Error state
  if (jobError || !job) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name='warning-outline' size={48} color='#ef4444' />
        <Text style={styles.errorText}>
          {jobError ? 'Failed to load job details' : 'Job not found'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetchJob()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Job Information */}
        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobDescription}>{job.description}</Text>

          <View style={styles.jobMeta}>
            <View style={styles.metaRow}>
              <Ionicons
                name='location-outline'
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>{job.location}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons
                name='cash-outline'
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>£{job.budget}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons
                name='calendar-outline'
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.metaText}>
                {new Date(job.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {job.category && (
              <View style={styles.metaRow}>
                <Ionicons
                  name='pricetag-outline'
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.metaText}>{job.category}</Text>
              </View>
            )}
          </View>

          {/* Job Photos */}
          {job.photos && job.photos.length > 0 && (
            <View style={styles.photosContainer}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photosList}>
                  {job.photos.map((photo: string, index: number) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={styles.jobPhoto}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Job Status Tracker */}
        <JobStatusTracker
          job={job}
          onStatusUpdate={handleJobStatusUpdate}
          showActions={true}
        />

        {/* AI Analysis for Contractors */}
        {user?.role === 'contractor' && job.photos && job.photos.length > 0 && (
          <View style={styles.aiAnalysisCard}>
            <View style={styles.aiAnalysisHeader}>
              <Ionicons
                name='bulb-outline'
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.aiAnalysisTitle}>AI Analysis</Text>
            </View>

            {aiLoading ? (
              <View style={styles.aiLoadingContainer}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.aiLoadingText}>
                  Analyzing job photos...
                </Text>
              </View>
            ) : aiAnalysis ? (
              <View style={styles.aiAnalysisContent}>
                <Text style={styles.aiConfidence}>
                  Confidence: {aiAnalysis.confidence}%
                </Text>

                {aiAnalysis.estimatedComplexity && (
                  <Text style={styles.aiComplexity}>
                    Complexity: {aiAnalysis.estimatedComplexity}
                  </Text>
                )}

                {aiAnalysis.safetyConcerns &&
                  aiAnalysis.safetyConcerns.length > 0 && (
                    <View style={styles.safetyConcerns}>
                      <Text style={styles.concernsTitle}>Safety Concerns:</Text>
                      {aiAnalysis.safetyConcerns.map(
                        (c: { concern: string }, index: number) => (
                          <Text key={index} style={styles.concernText}>
                            • {c.concern}
                          </Text>
                        )
                      )}
                    </View>
                  )}
              </View>
            ) : null}
          </View>
        )}

        {/* Contractor Assignment / Bidding */}
        {user?.role === 'homeowner' && (
          <ContractorAssignment
            job={job}
            onContractorAssigned={handleContractorAssigned}
          />
        )}

        {/* Bidding Button for Contractors */}
        {user?.role === 'contractor' && job.status === 'posted' && (
          <View style={styles.contractorActions}>
            <TouchableOpacity
              style={styles.bidButton}
              onPress={() =>
                navigation.navigate('BidSubmission', { jobId: job.id })
              }
            >
              <Ionicons name='hammer-outline' size={20} color={theme.colors.white} />
              <Text style={styles.bidButtonText}>Submit Bid</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contact Options */}
        {job.status !== 'posted' && (
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Communication</Text>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => {
                // Navigate to messaging
                const otherUserId =
                  user?.role === 'homeowner'
                    ? job.contractorId
                    : job.homeownerId;
                const otherUserName =
                  user?.role === 'homeowner' ? 'Contractor' : 'Homeowner';

                if (otherUserId) {
                  navigation.navigate('Messaging', {
                    jobId: job.id,
                    jobTitle: job.title,
                    otherUserId,
                    otherUserName,
                  });
                }
              }}
            >
              <Ionicons
                name='chatbubble-outline'
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.messageButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: theme.colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  jobCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  jobMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  photosContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  photosList: {
    flexDirection: 'row',
    gap: 12,
  },
  jobPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  aiAnalysisCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiAnalysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  aiLoadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  aiAnalysisContent: {
    gap: 8,
  },
  aiConfidence: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  aiComplexity: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  safetyConcerns: {
    marginTop: 8,
  },
  concernsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  concernText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  contractorActions: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  bidButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bidButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  contactCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.base,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
  },
  messageButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  // Added bid-related styles referenced in renderBidCard
  bidCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.base,
  },
  acceptedBidCard: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.surface,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  contractorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  bidMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  contractorRating: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  bidDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  acceptedText: {
    fontSize: 12,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  bidDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  bidFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bidActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  acceptButton: {
    backgroundColor: theme.colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rejectedText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: '600',
  },
});

export default JobDetailsScreen;
