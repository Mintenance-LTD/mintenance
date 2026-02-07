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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VideoListItem from '../../components/video/VideoListItem';
import VideoService from '../../services/VideoService';
import { logger } from '@mintenance/shared';
import { AssessmentStep, AssessmentVideo, AssessmentResults } from './types';
import { AssessmentHeader } from './components/AssessmentHeader';
import { ProgressBar } from './components/ProgressBar';
import { StepCard } from './components/StepCard';
import { AIInsightsCard } from './components/AIInsightsCard';
import { QuickActions, TipsCard } from './components/QuickActions';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack: () => void };
  route: {
    params?: {
      propertyId?: string;
      propertyAddress?: string;
    };
  };
}

const INITIAL_STEPS: AssessmentStep[] = [
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
];

export const PropertyAssessmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { propertyId, propertyAddress } = route.params || {};

  const [assessmentId] = useState(`assessment_${Date.now()}`);
  const [assessmentSteps, setAssessmentSteps] = useState<AssessmentStep[]>(INITIAL_STEPS);
  const [capturedVideos, setCapturedVideos] = useState<AssessmentVideo[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadVideos = async () => {
      if (!isCancelled) {
        const videos: AssessmentVideo[] = [];
        setCapturedVideos(videos);
      }
    };

    loadVideos();
    return () => { isCancelled = true; };
  }, []);

  const updateStepStatus = (stepId: string, status: AssessmentStep['status']) => {
    setAssessmentSteps(steps =>
      steps.map(step => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const handleStartVideoCapture = () => {
    navigation.navigate('VideoCaptureScreen', {
      assessmentId,
      propertyId,
      onComplete: (_videoId: string) => {
        updateStepStatus('video_walkthrough', 'in_progress');
      },
    });
  };

  const handleVideoPress = (video: AssessmentVideo) => {
    if (video.status === 'completed') {
      navigation.navigate('VideoProcessingStatus', {
        videoId: video.id,
        assessmentId,
        propertyId,
      });
    }
  };

  const handleRetryVideo = async (_videoId: string) => {
    try {
      await VideoService.retryFailed();
    } catch (error) {
      logger.error('Failed to retry video processing', { error });
      Alert.alert('Error', 'Failed to retry video processing');
    }
  };

  const handleStepPress = (step: AssessmentStep) => {
    switch (step.id) {
      case 'video_walkthrough':
        handleStartVideoCapture();
        break;
      case 'photos':
        Alert.alert('Coming Soon', 'Photo capture feature coming soon');
        break;
      case 'manual_notes':
        Alert.alert('Coming Soon', 'Manual notes feature coming soon');
        break;
      case 'review':
        handleReviewAssessment();
        break;
    }
  };

  const handleReviewAssessment = () => {
    const incompleteRequired = assessmentSteps.filter(
      step => step.required && step.status !== 'completed'
    );

    if (incompleteRequired.length > 0) {
      Alert.alert(
        'Incomplete Assessment',
        `Please complete the following steps: ${incompleteRequired.map(s => s.title).join(', ')}`,
      );
      return;
    }

    navigation.navigate('AssessmentReview', {
      assessmentId,
      propertyId,
      videos: capturedVideos,
    });
  };

  const progressPercentage = Math.round(
    (assessmentSteps.filter(s => s.status === 'completed').length / assessmentSteps.length) * 100
  );

  return (
    <SafeAreaView style={styles.container}>
      <AssessmentHeader
        propertyAddress={propertyAddress}
        onGoBack={() => navigation.goBack()}
      />
      <ProgressBar percentage={progressPercentage} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>Assessment Steps</Text>
          {assessmentSteps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              onPress={() => handleStepPress(step)}
            />
          ))}
        </View>

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

        {assessmentResults && (
          <AIInsightsCard
            results={assessmentResults}
            onViewFullAnalysis={() =>
              navigation.navigate('AssessmentResults', {
                assessmentId,
                results: assessmentResults,
              })
            }
          />
        )}

        <QuickActions onStartVideoCapture={handleStartVideoCapture} />
        <TipsCard />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  videosSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});

export default PropertyAssessmentScreen;
