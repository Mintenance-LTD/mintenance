/**
 * Video Capture Screen with Guidance
 * Provides step-by-step guidance for property video capture
 * Uses expo-camera for cross-platform camera access
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { styles } from './videoCaptureStyles';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VideoService, { VideoGuidancePhase } from '../../services/VideoService';
import { theme } from '../../theme';
import { logger } from '@mintenance/shared';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CapturedVideo {
  uri: string;
}

interface Props {
  navigation: unknown;
  route: {
    params?: {
      assessmentId?: string;
      propertyId?: string;
      onComplete?: (videoId: string) => void;
    };
  };
}

export const VideoCaptureScreen: React.FC<Props> = ({ navigation, route }) => {
  const { assessmentId, propertyId, onComplete } = route.params || {};

  // Camera setup
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const isFocused = useIsFocused();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [capturedVideo, setCapturedVideo] = useState<CapturedVideo | null>(null);

  // UI state
  const [showGuidance, setShowGuidance] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [torchOn, setTorchOn] = useState(false);

  // Animation values
  const recordingPulse = useSharedValue(1);
  const phaseProgressAnim = useSharedValue(0);
  const guidanceOpacity = useSharedValue(1);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout>();
  const phaseTimerRef = useRef<NodeJS.Timeout>();

  // Get current guidance phase
  const currentPhase = VideoService.guidancePhases[currentPhaseIndex];

  const hasPermission = cameraPermission?.granted && micPermission?.granted;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1
      );
    } else {
      recordingPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const requestPermissions = async () => {
    await requestCameraPermission();
    await requestMicPermission();
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);
      setCurrentPhaseIndex(0);
      setPhaseProgress(0);

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= VideoService.MAX_DURATION) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      // Start phase timer
      updatePhaseProgress();

      // Start camera recording
      const video = await cameraRef.current.recordAsync({
        maxDuration: VideoService.MAX_DURATION,
      });

      if (video) {
        setCapturedVideo({ uri: video.uri });
        setShowPreview(true);
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    } catch (error) {
      logger.error('Failed to start recording', { error });
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      cameraRef.current.stopRecording();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (phaseTimerRef.current) {
        clearInterval(phaseTimerRef.current);
      }

      // Check minimum duration
      if (recordingDuration < VideoService.MIN_DURATION) {
        Alert.alert(
          'Video Too Short',
          `Please record at least ${VideoService.MIN_DURATION} seconds for proper analysis.`,
          [{ text: 'OK', onPress: () => setCapturedVideo(null) }]
        );
      }
    } catch (error) {
      logger.error('Failed to stop recording', { error });
    }
  };

  const updatePhaseProgress = () => {
    phaseTimerRef.current = setInterval(() => {
      setPhaseProgress(prev => {
        const newProgress = prev + 1;
        const phaseDuration = VideoService.guidancePhases[currentPhaseIndex].duration;

        if (newProgress >= phaseDuration) {
          const nextIndex = currentPhaseIndex + 1;
          if (nextIndex < VideoService.guidancePhases.length) {
            setCurrentPhaseIndex(nextIndex);
            guidanceOpacity.value = withSequence(
              withTiming(0, { duration: 200 }),
              withTiming(1, { duration: 200 })
            );
            return 0;
          }
        }

        phaseProgressAnim.value = withTiming(newProgress / phaseDuration, {
          duration: 1000,
        });

        return newProgress;
      });
    }, 1000);
  };

  const processVideo = async () => {
    if (!capturedVideo) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const compressedPath = capturedVideo.uri.replace('.mp4', '_compressed.mp4');
      const compressionResult = await VideoService.compressVideo(
        capturedVideo.uri,
        compressedPath
      );

      if (!compressionResult.success) {
        throw new Error('Video compression failed');
      }

      const videoId = await VideoService.queueVideo(
        compressionResult.outputPath,
        compressionResult.metadata,
        {
          assessmentId,
          propertyId,
        }
      );

      logger.info('Video queued for processing', { videoId });

      Alert.alert('Video Uploaded', 'Your video has been queued for processing.');

      if (onComplete) {
        onComplete(videoId);
      }
    } catch (error) {
      logger.error('Video processing failed', { error });
      Alert.alert('Processing Error', 'Failed to process video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const retakeVideo = () => {
    setCapturedVideo(null);
    setShowPreview(false);
    setRecordingDuration(0);
    setCurrentPhaseIndex(0);
    setPhaseProgress(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const recordButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingPulse.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${phaseProgressAnim.value * 100}%`,
  }));

  const guidanceStyle = useAnimatedStyle(() => ({
    opacity: guidanceOpacity.value,
  }));

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="videocam-off" size={64} color="#666" />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && !showPreview && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="video"
          enableTorch={torchOn}
        />
      )}

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => (navigation as { goBack: () => void }).goBack()}
        >
          <Icon name="close" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.timerContainer}>
          <View style={styles.recordingIndicator}>
            {isRecording && (
              <View style={[styles.recordingDot, { backgroundColor: 'red' }]} />
            )}
            <Text style={styles.timerText}>
              {formatDuration(recordingDuration)} / {formatDuration(VideoService.MAX_DURATION)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setShowGuidance(!showGuidance)}
        >
          <Icon name="help-outline" size={28} color="white" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Guidance Overlay */}
      {showGuidance && isRecording && (
        <Reanimated.View style={[styles.guidanceOverlay, guidanceStyle]}>
          <View style={styles.guidanceCard}>
            <View style={styles.guidanceHeader}>
              <Text style={styles.phaseTitle}>{currentPhase.title}</Text>
              <Text style={styles.phaseTimer}>
                {formatDuration(phaseProgress)} / {formatDuration(currentPhase.duration)}
              </Text>
            </View>

            <View style={styles.progressBar}>
              <Reanimated.View style={[styles.progressFill, progressBarStyle]} />
            </View>

            <View style={styles.instructionsList}>
              {currentPhase.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <Icon name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>

            {currentPhase.tips.length > 0 && (
              <View style={styles.tipsContainer}>
                <Icon name="lightbulb-outline" size={20} color="#FFC107" />
                <Text style={styles.tipText}>{currentPhase.tips[0]}</Text>
              </View>
            )}
          </View>

          {/* Phase indicators */}
          <View style={styles.phaseIndicators}>
            {VideoService.guidancePhases.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.phaseIndicator,
                  index === currentPhaseIndex && styles.phaseIndicatorActive,
                  index < currentPhaseIndex && styles.phaseIndicatorComplete,
                ]}
              />
            ))}
          </View>
        </Reanimated.View>
      )}

      {/* Recording Controls */}
      <View style={styles.controls}>
        {!isRecording ? (
          <>
            <TouchableOpacity style={styles.secondaryButton}>
              <Icon name="photo-library" size={28} color="white" />
            </TouchableOpacity>

            <TouchableOpacity onPress={startRecording}>
              <Reanimated.View style={[styles.recordButton, recordButtonStyle]}>
                <View style={styles.recordButtonInner} />
              </Reanimated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setTorchOn(!torchOn)}
            >
              <Icon name={torchOn ? 'flash-on' : 'flash-off'} size={28} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.secondaryButton} />

            <TouchableOpacity onPress={stopRecording}>
              <Reanimated.View style={[styles.recordButton, recordButtonStyle]}>
                <View style={[styles.recordButtonInner, styles.recordButtonStop]} />
              </Reanimated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowGuidance(!showGuidance)}
            >
              <Icon name="info" size={28} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Video Preview Modal */}
      <Modal
        visible={showPreview && !!capturedVideo}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewContainer}>
          <SafeAreaView style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Review Your Video</Text>
          </SafeAreaView>

          <View style={styles.videoPreviewContainer}>
            <View style={styles.videoPlaceholder}>
              <Icon name="play-circle-outline" size={64} color="#666" />
              <Text style={styles.videoInfo}>
                Duration: {formatDuration(recordingDuration)}
              </Text>
              <Text style={styles.videoInfo}>
                Quality: HD (720p)
              </Text>
            </View>
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.retakeButton]}
              onPress={retakeVideo}
            >
              <Icon name="refresh" size={24} color="#666" />
              <Text style={styles.actionButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={processVideo}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Text style={styles.confirmButtonText}>Processing...</Text>
                  <Text style={styles.uploadProgress}>{uploadProgress}%</Text>
                </>
              ) : (
                <>
                  <Icon name="check" size={24} color="white" />
                  <Text style={styles.confirmButtonText}>Use Video</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};


export default VideoCaptureScreen;
