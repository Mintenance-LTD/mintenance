import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { JobService } from '../services/JobService';
import { AIAnalysisService, AIAnalysis } from '../services/AIAnalysisService';
import { useAuth } from '../contexts/AuthContext';
import { Job, Bid } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../utils/logger';


type JobDetailsScreenRouteProp = RouteProp<RootStackParamList, 'JobDetails'>;
type JobDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JobDetails'>;

interface Props {
  route: JobDetailsScreenRouteProp;
  navigation: JobDetailsScreenNavigationProp;
}

const JobDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const [jobData, bidsData] = await Promise.all([
        JobService.getJobById(jobId),
        JobService.getBidsByJob(jobId)
      ]);
      
      setJob(jobData);
      setBids(bidsData);
      
      // Load AI analysis for contractors if job has photos
      if (user?.role === 'contractor' && jobData?.photos && jobData.photos.length > 0) {
        loadAIAnalysis(jobData);
      }
    } catch (error) {
      logger.error('Failed to load job details:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

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

  const handleAcceptBid = async (bidId: string) => {
    Alert.alert(
      'Accept Bid',
      'Are you sure you want to accept this bid? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              await JobService.acceptBid(bidId);
              Alert.alert('Success', 'Bid accepted successfully!');
              loadJobDetails(); // Refresh data
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to accept bid');
            }
          }
        }
      ]
    );
  };

  const handleStartJob = async () => {
    Alert.alert(
      'Start Job',
      'Mark this job as started?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Job',
          style: 'default',
          onPress: async () => {
            try {
              await JobService.startJob(jobId);
              Alert.alert('Success', 'Job marked as in progress!');
              loadJobDetails();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update job status');
            }
          }
        }
      ]
    );
  };

  const handleCompleteJob = async () => {
    Alert.alert(
      'Complete Job',
      'Mark this job as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Job',
          style: 'default',
          onPress: async () => {
            try {
              await JobService.completeJob(jobId);
              Alert.alert('Success', 'Job marked as completed!');
              loadJobDetails();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update job status');
            }
          }
        }
      ]
    );
  };

  const renderBidCard = ({ item: bid }: { item: Bid }) => {
    const isAccepted = bid.status === 'accepted';
    const isPending = bid.status === 'pending';
    const daysAgo = Math.floor((new Date().getTime() - new Date(bid.createdAt).getTime()) / (1000 * 3600 * 24));
    
    return (
      <View style={[styles.bidCard, isAccepted && styles.acceptedBidCard]}>
        <View style={styles.bidHeader}>
          <View style={styles.contractorInfo}>
            <View style={styles.contractorAvatar}>
              <Ionicons name="person" size={20} color="#007AFF" />
            </View>
            <View>
              <Text style={styles.contractorName}>{bid.contractorName || 'Anonymous Contractor'}</Text>
              <View style={styles.bidMeta}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.contractorRating}>4.8 (127 reviews)</Text>
                <Text style={styles.bidDate}> • {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</Text>
              </View>
            </View>
          </View>
          <View style={styles.bidAmountContainer}>
            <Text style={styles.bidAmount}>${bid.amount.toLocaleString()}</Text>
            {isAccepted && (
              <View style={styles.acceptedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.acceptedText}>Hired</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.bidDescription}>{bid.description}</Text>
        
        <View style={styles.bidFooter}>
          <View style={styles.bidActions}>
            {user?.role === 'homeowner' && job?.status === 'posted' && isPending && (
              <>
                <TouchableOpacity style={styles.messageButton}>
                  <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptBid(bid.id)}
                >
                  <Ionicons name="checkmark-outline" size={16} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept Bid</Text>
                </TouchableOpacity>
              </>
            )}
            
            {bid.status === 'rejected' && (
              <View style={styles.rejectedBadge}>
                <Ionicons name="close-circle" size={16} color="#FF3B30" />
                <Text style={styles.rejectedText}>Not selected</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#34C759';
      case 'rejected': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return '#007AFF';
      case 'assigned': return '#5856D6';
      case 'in_progress': return '#FF9500';
      case 'completed': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'posted': return 'radio-button-on';
      case 'assigned': return 'person-add';
      case 'in_progress': return 'hammer';
      case 'completed': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const formatJobStatus = (status: string) => {
    switch (status) {
      case 'posted': return 'Open for Bids';
      case 'assigned': return 'Contractor Assigned';
      case 'in_progress': return 'Work in Progress';
      case 'completed': return 'Job Completed';
      default: return status;
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
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
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Job Status Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, job.status !== 'posted' && styles.progressStepActive]}>
              <Ionicons name={job.status !== 'posted' ? "checkmark-circle" : "radio-button-on"} size={20} color={job.status !== 'posted' ? "#34C759" : "#007AFF"} />
              <Text style={styles.progressLabel}>Posted</Text>
            </View>
            <View style={[styles.progressLine, (job.status === 'assigned' || job.status === 'in_progress' || job.status === 'completed') && styles.progressLineActive]} />
            <View style={[styles.progressStep, (job.status === 'assigned' || job.status === 'in_progress' || job.status === 'completed') && styles.progressStepActive]}>
              <Ionicons name={(job.status === 'assigned' || job.status === 'in_progress' || job.status === 'completed') ? "checkmark-circle" : "ellipse-outline"} size={20} color={(job.status === 'assigned' || job.status === 'in_progress' || job.status === 'completed') ? "#34C759" : "#CCC"} />
              <Text style={styles.progressLabel}>Assigned</Text>
            </View>
            <View style={[styles.progressLine, (job.status === 'in_progress' || job.status === 'completed') && styles.progressLineActive]} />
            <View style={[styles.progressStep, (job.status === 'in_progress' || job.status === 'completed') && styles.progressStepActive]}>
              <Ionicons name={(job.status === 'in_progress' || job.status === 'completed') ? "checkmark-circle" : "ellipse-outline"} size={20} color={(job.status === 'in_progress' || job.status === 'completed') ? "#34C759" : "#CCC"} />
              <Text style={styles.progressLabel}>In Progress</Text>
            </View>
            <View style={[styles.progressLine, job.status === 'completed' && styles.progressLineActive]} />
            <View style={[styles.progressStep, job.status === 'completed' && styles.progressStepActive]}>
              <Ionicons name={job.status === 'completed' ? "checkmark-circle" : "ellipse-outline"} size={20} color={job.status === 'completed' ? "#34C759" : "#CCC"} />
              <Text style={styles.progressLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Job Information Card */}
        <View style={styles.jobInfo}>
          <View style={styles.jobHeader}>
            <View style={styles.jobTitleSection}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getJobStatusColor(job.status) }]}>
                <Ionicons name={getJobStatusIcon(job.status)} size={14} color="#fff" style={styles.statusIcon} />
                <Text style={styles.statusText}>{formatJobStatus(job.status)}</Text>
              </View>
            </View>
            <Text style={styles.jobBudget}>${job.budget.toLocaleString()}</Text>
          </View>
          
          <Text style={styles.jobDescription}>{job.description}</Text>
          
          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{job.location}</Text>
            </View>
            
            {job.category && (
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{job.category}</Text>
              </View>
            )}
            
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.metaText}>Posted {new Date(job.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          
          {/* Job Photos */}
          {job.photos && job.photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.photosTitle}>Problem Photos ({job.photos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
                {job.photos.map((photo, index) => (
                  <TouchableOpacity key={index} style={styles.photoContainer}>
                    <Image source={{ uri: photo }} style={styles.jobPhoto} />
                    <View style={styles.photoOverlay}>
                      <Ionicons name="expand-outline" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Enhanced AI Analysis Section */}
        {user?.role === 'contractor' && (job?.photos && job.photos.length > 0) && (
          <View style={styles.aiAnalysisDetailedSection}>
            <View style={styles.aiAnalysisDetailedHeader}>
              <View style={styles.aiTitleRow}>
                <Ionicons name="bulb" size={24} color="#FF9500" />
                <Text style={styles.aiAnalysisDetailedTitle}>AI Analysis Report</Text>
              </View>
              {aiLoading ? (
                <View style={styles.loadingBadge}>
                  <Text style={styles.loadingBadgeText}>Analyzing...</Text>
                </View>
              ) : aiAnalysis ? (
                <View style={styles.confidenceDetailedBadge}>
                  <Text style={styles.confidenceDetailedText}>{aiAnalysis.confidence}% confident</Text>
                </View>
              ) : null}
            </View>
            
            {aiAnalysis && !aiLoading && (
              <>
                {/* Detected Equipment */}
                {aiAnalysis.detectedEquipment && aiAnalysis.detectedEquipment.length > 0 && (
                  <View style={styles.analysisSubsection}>
                    <View style={styles.analysisSubsectionHeader}>
                      <Ionicons name="construct" size={18} color="#007AFF" />
                      <Text style={styles.analysisSubsectionTitle}>Detected Equipment</Text>
                    </View>
                    {aiAnalysis.detectedEquipment.map((item, index) => (
                      <View key={index} style={styles.equipmentItem}>
                        <View style={styles.equipmentInfo}>
                          <Text style={styles.equipmentName}>{item.name}</Text>
                          <Text style={styles.equipmentLocation}>Location: {item.location}</Text>
                        </View>
                        <View style={styles.equipmentConfidence}>
                          <Text style={styles.equipmentConfidenceText}>{item.confidence}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
            
                {/* Safety Concerns */}
                <View style={styles.analysisSubsection}>
                  <View style={styles.analysisSubsectionHeader}>
                    <Ionicons name="warning" size={18} color="#FF3B30" />
                    <Text style={styles.analysisSubsectionTitle}>Safety Concerns</Text>
                  </View>
                  {aiAnalysis.safetyConcerns.map((concern, index) => (
                    <View key={index} style={styles.safetyConcernDetailedItem}>
                      <View style={styles.concernHeader}>
                        <Text style={styles.concernTitle}>{concern.concern}</Text>
                        <View style={[styles.severityBadge, { 
                          backgroundColor: concern.severity === 'High' ? '#FF3B30' : 
                                           concern.severity === 'Medium' ? '#FF9500' : '#34C759' 
                        }]}>
                          <Text style={styles.severityText}>{concern.severity}</Text>
                        </View>
                      </View>
                      <Text style={styles.concernDescription}>{concern.description}</Text>
                    </View>
                  ))}
                </View>
            
                {/* Recommended Actions */}
                <View style={styles.analysisSubsection}>
                  <View style={styles.analysisSubsectionHeader}>
                    <Ionicons name="list" size={18} color="#34C759" />
                    <Text style={styles.analysisSubsectionTitle}>Recommended Actions</Text>
                  </View>
                  {aiAnalysis.recommendedActions.map((action, index) => (
                    <View key={index} style={styles.actionItem}>
                      <View style={styles.actionBullet}>
                        <Text style={styles.actionBulletText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.actionText}>{action}</Text>
                    </View>
                  ))}
                </View>
            
                {/* Job Complexity & Tools */}
                <View style={styles.jobComplexitySection}>
                  <View style={styles.complexityRow}>
                    <View style={styles.complexityItem}>
                      <Ionicons name="speedometer" size={16} color="#FF9500" />
                      <Text style={styles.complexityLabel}>Complexity</Text>
                      <Text style={styles.complexityValue}>{aiAnalysis.estimatedComplexity}</Text>
                    </View>
                    
                    <View style={styles.complexityItem}>
                      <Ionicons name="time" size={16} color="#007AFF" />
                      <Text style={styles.complexityLabel}>Duration</Text>
                      <Text style={styles.complexityValue}>{aiAnalysis.estimatedDuration}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.toolsSection}>
                    <Text style={styles.toolsTitle}>Suggested Tools:</Text>
                    <View style={styles.toolsList}>
                      {aiAnalysis.suggestedTools.map((tool, index) => (
                        <View key={index} style={styles.toolTag}>
                          <Text style={styles.toolText}>{tool}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {user?.role === 'contractor' && job.status === 'posted' && (
          <View style={styles.contractorActionButtons}>
            <TouchableOpacity
              style={styles.bidButton}
              onPress={() => navigation.navigate('BidSubmission', { jobId })}
            >
              <Ionicons name="hammer-outline" size={20} color="#fff" />
              <Text style={styles.bidButtonText}>Apply for Job</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.chatButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
              <Text style={styles.chatButtonText}>Chat with Client</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.role === 'contractor' && job.contractorId === user.id && job.status === 'assigned' && (
          <TouchableOpacity
            style={styles.startJobButton}
            onPress={handleStartJob}
          >
            <Ionicons name="play-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Start Job</Text>
          </TouchableOpacity>
        )}

        {user?.role === 'contractor' && job.contractorId === user.id && job.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.completeJobButton}
            onPress={handleCompleteJob}
          >
            <Ionicons name="checkmark-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Mark as Complete</Text>
          </TouchableOpacity>
        )}

        {/* Homeowner Actions */}
        {user?.role === 'homeowner' && (job.status === 'in_progress' || job.status === 'assigned') && (
          <View style={styles.homeownerActions}>
            <TouchableOpacity style={styles.messageContractorButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
              <Text style={styles.messageContractorText}>Message Contractor</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bidsSection}>
          <Text style={styles.bidsTitle}>Bids ({bids.length})</Text>
          
          {bids.length > 0 ? (
            <FlatList
              data={bids}
              renderItem={renderBidCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.noBidsContainer}>
              <Text style={styles.noBidsText}>No bids yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#007AFF',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 2,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressStepActive: {
    // Active state handled by icon color
  },
  progressLine: {
    height: 2,
    backgroundColor: '#E5E5EA',
    flex: 1,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#34C759',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  jobInfo: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobTitleSection: {
    flex: 1,
    marginRight: 16,
  },
  jobTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  jobDescription: {
    fontSize: 17,
    color: '#444',
    marginBottom: 20,
    lineHeight: 26,
  },
  jobMeta: {
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  jobBudget: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  photosSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  photosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  photosContainer: {
    flexDirection: 'row',
  },
  jobPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  contractorActionButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  bidButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  chatButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  bidButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  startJobButton: {
    backgroundColor: '#FF9500',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeJobButton: {
    backgroundColor: '#34C759',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  homeownerActions: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  messageContractorButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  messageContractorText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  bidsSection: {
    backgroundColor: '#fff',
    padding: 20,
  },
  bidsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  bidCard: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  acceptedBidCard: {
    borderColor: '#34C759',
    backgroundColor: '#f8fff8',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  contractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contractorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contractorName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bidMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractorRating: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  bidAmountContainer: {
    alignItems: 'flex-end',
  },
  bidAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  acceptedText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
    marginLeft: 4,
  },
  bidDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
    lineHeight: 24,
  },
  bidFooter: {
    marginTop: 8,
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bidDate: {
    fontSize: 13,
    color: '#999',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  messageButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rejectedText: {
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '500',
    marginLeft: 6,
  },
  noBidsContainer: {
    padding: 60,
    alignItems: 'center',
  },
  noBidsText: {
    fontSize: 17,
    color: '#999',
    textAlign: 'center',
  },
  loadingBadge: {
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  loadingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

// Quick action buttons for job progress updates

export default JobDetailsScreen;