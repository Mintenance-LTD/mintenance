/**
 * Video Processing Status Screen
 * Shows real-time processing status and results from SAM2
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { styles } from './videoProcessingStatusStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import VideoService from '../../services/VideoService';
import { logger } from '@mintenance/shared';
import { theme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  navigation: unknown;
  route: {
    params: {
      videoId: string;
      assessmentId?: string;
      propertyId?: string;
    };
  };
}

interface ProcessingStage {
  stage: 'queued' | 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  title: string;
  description: string;
  icon: string;
  progress?: number;
}

const PROCESSING_STAGES: ProcessingStage[] = [
  {
    stage: 'queued',
    title: 'Queued',
    description: 'Video is waiting to be processed',
    icon: 'schedule',
  },
  {
    stage: 'uploading',
    title: 'Uploading',
    description: 'Uploading video to cloud storage',
    icon: 'cloud-upload',
  },
  {
    stage: 'processing',
    title: 'Processing',
    description: 'AI is analyzing your video frame by frame',
    icon: 'memory',
  },
  {
    stage: 'analyzing',
    title: 'Analyzing',
    description: 'Identifying damage and generating assessment',
    icon: 'analytics',
  },
  {
    stage: 'completed',
    title: 'Complete',
    description: 'Assessment ready',
    icon: 'check-circle',
  },
];

export const VideoProcessingStatusScreen: React.FC<Props> = ({ navigation, route }) => {
  const { videoId, assessmentId, propertyId } = route.params;

  const [currentStage, setCurrentStage] = useState<ProcessingStage>(PROCESSING_STAGES[0]);
  const [processingResults, setProcessingResults] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<unknown>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Animation values
  const progressAnimation = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  // Polling interval
  const pollingInterval = useRef<NodeJS.Timeout>();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    startPolling();

    // Start animations
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1
    );

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const startPolling = () => {
    // Poll every 2 seconds
    pollingInterval.current = setInterval(async () => {
      await checkProcessingStatus();
    }, 2000);

    // Initial check
    checkProcessingStatus();
  };

  const checkProcessingStatus = async () => {
    try {
      // Get queue status
      const status = VideoService.getQueueStatus();
      setQueueStatus(status);

      // Get processing results if available
      const results = await VideoService.getProcessingResults(videoId);

      if (results) {
        setProcessingResults(results);
        setCurrentStage(PROCESSING_STAGES[4]); // Completed
        setIsComplete(true);

        // Stop polling
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }

        // Animate progress to 100%
        progressAnimation.value = withTiming(1, { duration: 500 });
      } else {
        // Update stage based on queue status
        if (status.current?.id === videoId) {
          switch (status.current.status) {
            case 'uploading':
              setCurrentStage(PROCESSING_STAGES[1]);
              progressAnimation.value = withTiming(0.25, { duration: 500 });
              break;
            case 'processing':
              setCurrentStage(PROCESSING_STAGES[2]);
              progressAnimation.value = withTiming(0.5, { duration: 500 });
              break;
            case 'failed':
              setCurrentStage({
                stage: 'failed',
                title: 'Processing Failed',
                description: 'An error occurred during processing',
                icon: 'error',
              });
              setError('Video processing failed. Please try again.');
              if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
              }
              break;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to check processing status', { error });
    }
  };

  const handleRetry = async () => {
    setError(null);
    setCurrentStage(PROCESSING_STAGES[0]);
    await VideoService.retryFailed();
    startPolling();
  };

  const handleViewResults = () => {
    if (processingResults) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleDone = () => {
    navigation.navigate('HomeTab' as never);
  };

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value * 100}%`,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const renderDamageItem = (type: string, data: unknown) => {
    const severityColors = {
      early: '#4CAF50',
      midway: '#FF9800',
      full: '#F44336',
      none: '#9E9E9E',
    };

    return (
      <View key={type} style={styles.damageItem}>
        <View style={styles.damageHeader}>
          <Text style={styles.damageType}>{type}</Text>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: severityColors[data.severity_estimate] },
            ]}
          >
            <Text style={styles.severityText}>{data.severity_estimate}</Text>
          </View>
        </View>
        <View style={styles.damageDetails}>
          <Text style={styles.damageDetailText}>
            Instances: {data.instance_count}
          </Text>
          <Text style={styles.damageDetailText}>
            Confidence: {(data.average_confidence * 100).toFixed(1)}%
          </Text>
          <Text style={styles.damageDetailText}>
            Coverage: {(data.temporal_coverage * 100).toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Processing</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Processing Status */}
        <View style={styles.statusCard}>
          <Animated.View style={[styles.statusIcon, iconStyle]}>
            <Icon
              name={currentStage.icon}
              size={64}
              color={
                currentStage.stage === 'completed'
                  ? '#4CAF50'
                  : currentStage.stage === 'failed'
                  ? '#F44336'
                  : '#007AFF'
              }
            />
          </Animated.View>

          <Text style={styles.statusTitle}>{currentStage.title}</Text>
          <Text style={styles.statusDescription}>{currentStage.description}</Text>

          {!isComplete && !error && (
            <>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View style={[styles.progressFill, progressBarStyle]} />
                </View>
              </View>

              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={styles.loader}
              />
            </>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Icon name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Queue Status */}
        {queueStatus && !isComplete && (
          <View style={styles.queueCard}>
            <Text style={styles.queueTitle}>Queue Status</Text>
            <View style={styles.queueStats}>
              <View style={styles.queueStat}>
                <Text style={styles.queueStatValue}>{queueStatus.pending}</Text>
                <Text style={styles.queueStatLabel}>Pending</Text>
              </View>
              <View style={styles.queueStat}>
                <Text style={styles.queueStatValue}>{queueStatus.uploading}</Text>
                <Text style={styles.queueStatLabel}>Uploading</Text>
              </View>
              <View style={styles.queueStat}>
                <Text style={styles.queueStatValue}>{queueStatus.processing}</Text>
                <Text style={styles.queueStatLabel}>Processing</Text>
              </View>
            </View>
          </View>
        )}

        {/* Processing Results */}
        {processingResults && (
          <Animated.View
            entering={FadeIn.duration(500)}
            style={styles.resultsCard}
          >
            <View style={styles.resultsHeader}>
              <Icon name="assessment" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.resultsTitle}>Assessment Results</Text>
            </View>

            {processingResults.aggregated_assessment && (
              <>
                {/* Overall Assessment */}
                <View style={styles.overallAssessment}>
                  <View style={styles.assessmentRow}>
                    <Text style={styles.assessmentLabel}>Severity:</Text>
                    <Text
                      style={[
                        styles.assessmentValue,
                        styles[`severity_${processingResults.aggregated_assessment.overall_severity}`],
                      ]}
                    >
                      {processingResults.aggregated_assessment.overall_severity.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.assessmentRow}>
                    <Text style={styles.assessmentLabel}>Confidence:</Text>
                    <Text style={styles.assessmentValue}>
                      {processingResults.aggregated_assessment.confidence_level}
                    </Text>
                  </View>
                  <View style={styles.assessmentRow}>
                    <Text style={styles.assessmentLabel}>Damages Found:</Text>
                    <Text style={styles.assessmentValue}>
                      {processingResults.aggregated_assessment.total_unique_damages}
                    </Text>
                  </View>
                </View>

                {/* Damage Summary */}
                {Object.keys(processingResults.aggregated_assessment.damage_summary).length > 0 && (
                  <View style={styles.damageSection}>
                    <Text style={styles.damageSectionTitle}>Damage Details</Text>
                    {Object.entries(processingResults.aggregated_assessment.damage_summary).map(
                      ([type, data]: [string, Record<string, unknown>]) =>
                        data.instance_count > 0 && renderDamageItem(type, data)
                    )}
                  </View>
                )}

                {/* High Priority Damages */}
                {processingResults.aggregated_assessment.high_priority_damages.length > 0 && (
                  <View style={styles.prioritySection}>
                    <View style={styles.priorityHeader}>
                      <Icon name="warning" size={20} color="#F44336" />
                      <Text style={styles.priorityTitle}>High Priority</Text>
                    </View>
                    {processingResults.aggregated_assessment.high_priority_damages.map(
                      (damage: string) => (
                        <View key={damage} style={styles.priorityItem}>
                          <Icon name="chevron-right" size={16} color="#F44336" />
                          <Text style={styles.priorityText}>{damage}</Text>
                        </View>
                      )
                    )}
                  </View>
                )}

                {/* Video Metadata */}
                <View style={styles.metadataSection}>
                  <Text style={styles.metadataTitle}>Video Information</Text>
                  <Text style={styles.metadataText}>
                    Duration: {processingResults.aggregated_assessment.video_metadata.duration_seconds.toFixed(1)}s
                  </Text>
                  <Text style={styles.metadataText}>
                    Frames Analyzed: {processingResults.aggregated_assessment.video_metadata.processed_frames}
                  </Text>
                  <Text style={styles.metadataText}>
                    Resolution: {processingResults.aggregated_assessment.video_metadata.resolution.width}x
                    {processingResults.aggregated_assessment.video_metadata.resolution.height}
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        )}

        {/* Action Buttons */}
        {isComplete && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleViewResults}
            >
              <Text style={styles.primaryButtonText}>View Full Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleDone}
            >
              <Text style={styles.secondaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips Section */}
        {!isComplete && !error && (
          <View style={styles.tipsCard}>
            <Icon name="info-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.tipsText}>
              AI processing typically takes 1-2 minutes for a 60-second video.
              You can leave this screen and come back later to check results.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};


export default VideoProcessingStatusScreen;