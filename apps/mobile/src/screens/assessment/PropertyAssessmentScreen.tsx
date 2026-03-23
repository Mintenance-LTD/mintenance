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
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VideoListItem from '../../components/video/VideoListItem';
import VideoService from '../../services/VideoService';
import { logger } from '@mintenance/shared';
import { theme } from '../../theme';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AssessmentStep, AssessmentVideo, AssessmentResults } from './types';
import { AssessmentHeader } from './components/AssessmentHeader';
import { ProgressBar } from './components/ProgressBar';
import { StepCard } from './components/StepCard';
import { AIInsightsCard } from './components/AIInsightsCard';
import { QuickActions, TipsCard } from './components/QuickActions';

interface Props {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
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

export const PropertyAssessmentScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { propertyId, propertyAddress } = route.params || {};
  const { user } = useAuth();

  const [assessmentId] = useState(`assessment_${Date.now()}`);
  const [assessmentSteps, setAssessmentSteps] =
    useState<AssessmentStep[]>(INITIAL_STEPS);
  const [capturedVideos, setCapturedVideos] = useState<AssessmentVideo[]>([]);
  const [assessmentResults, setAssessmentResults] =
    useState<AssessmentResults | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [manualNotes, setManualNotes] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadVideos = async () => {
      if (!isCancelled) {
        const videos: AssessmentVideo[] = [];
        setCapturedVideos(videos);
      }
    };

    loadVideos();
    return () => {
      isCancelled = true;
    };
  }, []);

  const updateStepStatus = (
    stepId: string,
    status: AssessmentStep['status']
  ) => {
    setAssessmentSteps((steps) =>
      steps.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const handleStartVideoCapture = () => {
    navigation.navigate('VideoCapture', { assessmentId, propertyId });
  };

  const handleVideoPress = (video: AssessmentVideo) => {
    navigation.navigate('VideoProcessingStatus', {
      videoId: video.id,
      assessmentId,
      propertyId,
    });
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
        navigation.navigate('PhotoUpload', {
          jobId: assessmentId,
          photoType: 'before',
        });
        break;
      case 'manual_notes':
        setShowNotes((prev) => !prev);
        updateStepStatus('manual_notes', 'in_progress');
        break;
      case 'review':
        handleReviewAssessment();
        break;
    }
  };

  const handleReviewAssessment = () => {
    const incompleteRequired = assessmentSteps.filter(
      (step) => step.required && step.status !== 'completed'
    );

    if (incompleteRequired.length > 0) {
      Alert.alert(
        'Incomplete Assessment',
        `Please complete the following steps: ${incompleteRequired.map((s) => s.title).join(', ')}`
      );
      return;
    }

    setShowReview(true);
  };

  const handleSubmitAssessment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (!user?.id) {
        Alert.alert('Error', 'You must be logged in to submit an assessment.');
        return;
      }

      // Collect photo URLs from captured videos (thumbnails) and any uploaded photos
      const photoUrls: string[] = capturedVideos
        .filter((v) => v.thumbnailUri)
        .map((v) => v.thumbnailUri!);

      // Build assessment data payload
      const assessmentData = {
        steps_completed: assessmentSteps
          .filter((s) => s.status === 'completed')
          .map((s) => s.id),
        manual_notes: manualNotes || null,
        video_count: capturedVideos.length,
        photo_count: photoUrls.length,
        property_address: propertyAddress || null,
        submitted_from: 'mobile_app',
        submitted_at: new Date().toISOString(),
      };

      // Insert into building_assessments table
      const { data: assessment, error: insertError } = await supabase
        .from('building_assessments')
        .insert({
          user_id: user.id,
          property_id: propertyId || null,
          domain: 'building',
          assessment_data: assessmentData,
          validation_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) {
        logger.error('Failed to save assessment', { error: insertError });
        Alert.alert('Error', 'Failed to save assessment. Please try again.');
        return;
      }

      // If we have photo URLs, save them as assessment images
      if (photoUrls.length > 0 && assessment?.id) {
        const imageInserts = photoUrls.map((url) => ({
          assessment_id: assessment.id,
          image_url: url,
          image_type: 'walkthrough',
          created_at: new Date().toISOString(),
        }));

        await supabase.from('assessment_images').insert(imageInserts);
      }

      logger.info('Assessment submitted successfully', {
        assessmentId: assessment?.id,
        propertyId,
        userId: user.id,
      });

      Alert.alert(
        'Assessment Submitted',
        'Your property assessment has been saved and will be reviewed.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      logger.error('Assessment submission failed', { error });
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = Math.round(
    (assessmentSteps.filter((s) => s.status === 'completed').length /
      assessmentSteps.length) *
      100
  );

  return (
    <SafeAreaView style={styles.container}>
      <AssessmentHeader
        propertyAddress={propertyAddress}
        onGoBack={() => navigation.goBack()}
      />
      <ProgressBar percentage={progressPercentage} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
                <Icon
                  name='add-circle'
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {capturedVideos.map((video) => (
              <VideoListItem
                key={video.id}
                video={
                  {
                    ...video,
                    createdAt: '',
                    duration: video.duration ?? 0,
                  } as unknown as React.ComponentProps<
                    typeof VideoListItem
                  >['video']
                }
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
              navigation.navigate('Modal', { screen: 'AIAssessment' })
            }
          />
        )}

        {/* Inline Manual Notes Section */}
        {showNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Manual Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={5}
              placeholder='Add your observations, context, or notes about the property...'
              placeholderTextColor={theme.colors.textTertiary}
              value={manualNotes}
              onChangeText={(text) => {
                setManualNotes(text);
                if (text.length > 0) {
                  updateStepStatus('manual_notes', 'completed');
                } else {
                  updateStepStatus('manual_notes', 'in_progress');
                }
              }}
              textAlignVertical='top'
            />
          </View>
        )}

        {/* Inline Review Summary */}
        {showReview && (
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>Assessment Summary</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Property</Text>
              <Text style={styles.reviewValue}>
                {propertyAddress || 'Not specified'}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Videos captured</Text>
              <Text style={styles.reviewValue}>{capturedVideos.length}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Notes</Text>
              <Text style={styles.reviewValue}>
                {manualNotes ? 'Added' : 'None'}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Progress</Text>
              <Text style={styles.reviewValue}>
                {progressPercentage}% complete
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmitAssessment}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Assessment</Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: theme.colors.backgroundSecondary,
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
    color: theme.colors.textPrimary,
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
  notesSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  notesInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
    minHeight: 120,
  },
  reviewSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  reviewLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PropertyAssessmentScreen;
