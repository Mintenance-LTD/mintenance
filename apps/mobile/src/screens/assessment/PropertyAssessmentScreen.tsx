/**
 * Property Assessment Screen
 * Integrates video capture with property assessment workflow
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VideoListItem from '../../components/video/VideoListItem';
import VideoService from '../../services/VideoService';
import { logger } from '@mintenance/shared';

interface Props {
  navigation: any;
  route: {
    params?: {
      propertyId?: string;
      propertyAddress?: string;
    };
  };
}

interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed';
  required: boolean;
}

export const PropertyAssessmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { propertyId, propertyAddress } = route.params || {};

  const [assessmentId] = useState(`assessment_${Date.now()}`);
  const [assessmentSteps, setAssessmentSteps] = useState<AssessmentStep[]>([
    {
      id: 'property_info',
      title: 'Property Information',
      description: 'Basic details about the property',
      icon: 'home',
      status: 'completed',
      required: true,
    },
    {
      id: 'video_walkthrough',
      title: 'Video Walkthrough',
      description: 'Capture 30-60 second property video',
      icon: 'videocam',
      status: 'pending',
      required: true,
    },
    {
      id: 'photos',
      title: 'Additional Photos',
      description: 'Capture specific damage areas',
      icon: 'photo-camera',
      status: 'pending',
      required: false,
    },
    {
      id: 'manual_notes',
      title: 'Manual Notes',
      description: 'Add observations and context',
      icon: 'edit-note',
      status: 'pending',
      required: false,
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review assessment before submitting',
      icon: 'fact-check',
      status: 'pending',
      required: true,
    },
  ]);

  const [capturedVideos, setCapturedVideos] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<any>(null);

  useEffect(() => {
    loadCapturedVideos();
  }, []);

  const loadCapturedVideos = async () => {
    // Load videos for this assessment
    // This would fetch from local storage or API
    const videos = []; // Placeholder
    setCapturedVideos(videos);
  };

  const handleStartVideoCapture = () => {
    navigation.navigate('VideoCaptureScreen', {
      assessmentId,
      propertyId,
      onComplete: (videoId: string) => {
        // Update step status
        updateStepStatus('video_walkthrough', 'in_progress');
        // Reload videos
        loadCapturedVideos();
      },
    });
  };

  const handleVideoPress = (video: any) => {
    if (video.status === 'completed') {
      navigation.navigate('VideoProcessingStatus', {
        videoId: video.id,
        assessmentId,
        propertyId,
      });
    }
  };

  const handleRetryVideo = async (videoId: string) => {
    try {
      await VideoService.retryFailed();
      loadCapturedVideos();
    } catch (error) {
      logger.error('Failed to retry video processing', { error });
      Alert.alert('Error', 'Failed to retry video processing');
    }
  };

  const updateStepStatus = (stepId: string, status: AssessmentStep['status']) => {
    setAssessmentSteps(steps =>
      steps.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const handleStepPress = (step: AssessmentStep) => {
    switch (step.id) {
      case 'video_walkthrough':
        handleStartVideoCapture();
        break;
      case 'photos':
        // Navigate to photo capture
        Alert.alert('Coming Soon', 'Photo capture feature coming soon');
        break;
      case 'manual_notes':
        // Navigate to notes screen
        Alert.alert('Coming Soon', 'Manual notes feature coming soon');
        break;
      case 'review':
        handleReviewAssessment();
        break;
    }
  };

  const handleReviewAssessment = () => {
    // Check if all required steps are completed
    const incompleteRequired = assessmentSteps.filter(
      step => step.required && step.status !== 'completed'
    );

    if (incompleteRequired.length > 0) {
      Alert.alert(
        'Incomplete Assessment',
        `Please complete the following steps: ${incompleteRequired
          .map(s => s.title)
          .join(', ')}`,
      );
      return;
    }

    // Navigate to review screen
    navigation.navigate('AssessmentReview', {
      assessmentId,
      propertyId,
      videos: capturedVideos,
    });
  };

  const getStepStatusIcon = (status: AssessmentStep['status']) => {
    switch (status) {
      case 'completed':
        return <Icon name="check-circle" size={24} color="#4CAF50" />;
      case 'in_progress':
        return <Icon name="pending" size={24} color="#FF9800" />;
      default:
        return <Icon name="radio-button-unchecked" size={24} color="#999" />;
    }
  };

  const getProgressPercentage = () => {
    const completed = assessmentSteps.filter(s => s.status === 'completed').length;
    return Math.round((completed / assessmentSteps.length) * 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Property Assessment</Text>
          <Text style={styles.headerSubtitle}>
            {propertyAddress || 'New Assessment'}
          </Text>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]}
          />
        </View>
        <Text style={styles.progressText}>{getProgressPercentage()}% Complete</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Assessment Steps */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>Assessment Steps</Text>
          {assessmentSteps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.stepCard,
                step.status === 'completed' && styles.stepCardCompleted,
              ]}
              onPress={() => handleStepPress(step)}
              disabled={step.status === 'completed'}
            >
              <View style={styles.stepIcon}>
                <Icon
                  name={step.icon}
                  size={24}
                  color={step.status === 'completed' ? '#4CAF50' : '#666'}
                />
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  {step.required && (
                    <Text style={styles.requiredBadge}>Required</Text>
                  )}
                </View>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              {getStepStatusIcon(step.status)}
            </TouchableOpacity>
          ))}
        </View>

        {/* Captured Videos Section */}
        {capturedVideos.length > 0 && (
          <View style={styles.videosSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Captured Videos</Text>
              <TouchableOpacity onPress={handleStartVideoCapture}>
                <Icon name="add-circle" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            {capturedVideos.map(video => (
              <VideoListItem
                key={video.id}
                video={video}
                onPress={() => handleVideoPress(video)}
                onRetry={
                  video.status === 'failed'
                    ? () => handleRetryVideo(video.id)
                    : undefined
                }
              />
            ))}
          </View>
        )}

        {/* AI Insights Preview */}
        {assessmentResults && (
          <View style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <Icon name="insights" size={24} color="#007AFF" />
              <Text style={styles.insightsTitle}>AI Analysis Preview</Text>
            </View>
            <View style={styles.insightsList}>
              <View style={styles.insightItem}>
                <Icon name="warning" size={16} color="#FF9800" />
                <Text style={styles.insightText}>
                  {assessmentResults.total_damages} potential issues detected
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Icon name="trending-up" size={16} color="#4CAF50" />
                <Text style={styles.insightText}>
                  Confidence: {assessmentResults.confidence_level}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewInsightsButton}
              onPress={() =>
                navigation.navigate('AssessmentResults', {
                  assessmentId,
                  results: assessmentResults,
                })
              }
            >
              <Text style={styles.viewInsightsText}>View Full Analysis</Text>
              <Icon name="arrow-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={handleStartVideoCapture}
          >
            <Icon name="videocam" size={24} color="white" />
            <Text style={styles.primaryActionText}>Start Video Capture</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryAction}>
              <Icon name="save" size={20} color="#666" />
              <Text style={styles.secondaryActionText}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction}>
              <Icon name="share" size={20} color="#666" />
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Card */}
        <View style={styles.tipsCard}>
          <Icon name="lightbulb-outline" size={20} color="#FFC107" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Pro Tip</Text>
            <Text style={styles.tipsText}>
              For best results, record video in good lighting and move slowly to capture
              all areas. The AI needs clear footage to detect damage accurately.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  progressContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  stepsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepCardCompleted: {
    backgroundColor: '#F0FFF4',
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requiredBadge: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '600',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
  },
  videosSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  insightsList: {
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
  },
  viewInsightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  viewInsightsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  quickActions: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#007AFF',
    marginBottom: 12,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#795548',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
});

export default PropertyAssessmentScreen;