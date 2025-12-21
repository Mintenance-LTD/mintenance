/**
 * Video Capture Screen with Guidance
 * Provides step-by-step guidance for property video capture
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
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
  VideoFile,
  CameraPermissionStatus,
} from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VideoService, { VideoGuidancePhase } from '../../services/VideoService';
import { logger } from '@mintenance/shared';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  navigation: any;
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
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isFocused = useIsFocused();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [capturedVideo, setCapturedVideo] = useState<VideoFile | null>(null);

  // UI state
  const [showGuidance, setShowGuidance] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Animation values
  const recordingPulse = useSharedValue(1);
  const phaseProgressAnim = useSharedValue(0);
  const guidanceOpacity = useSharedValue(1);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout>();
  const phaseTimerRef = useRef<NodeJS.Timeout>();

  // Get current guidance phase
  const currentPhase = VideoService.guidancePhases[currentPhaseIndex];

  // Camera format with proper video settings
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { fps: 30 },
  ]);

  useEffect(() => {
    checkPermissions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Start recording animation
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

  const checkPermissions = async () => {
    const status = await Camera.getCameraPermissionStatus();
    const micStatus = await Camera.getMicrophonePermissionStatus();

    if (status === 'not-determined' || micStatus === 'not-determined') {
      const newCameraStatus = await Camera.requestCameraPermission();
      const newMicStatus = await Camera.requestMicrophonePermission();
      setHasPermission(
        newCameraStatus === 'granted' && newMicStatus === 'granted'
      );
    } else {
      setHasPermission(status === 'granted' && micStatus === 'granted');
    }
  };

  const startRecording = async () => {
    if (!camera.current || isRecording) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);
      setCurrentPhaseIndex(0);
      setPhaseProgress(0);

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;

          // Check if we've exceeded max duration
          if (newDuration >= VideoService.MAX_DURATION) {
            stopRecording();
          }

          return newDuration;
        });
      }, 1000);

      // Start phase timer
      updatePhaseProgress();

      // Start camera recording
      const video = await camera.current.startRecording({
        onRecordingFinished: (video) => {
          logger.info('Recording finished', { video });
          setCapturedVideo(video);
          setShowPreview(true);
        },
        onRecordingError: (error) => {
          logger.error('Recording error', { error });
          Alert.alert('Recording Error', 'Failed to record video. Please try again.');
          setIsRecording(false);
        },
        fileType: 'mp4',
        videoCodec: 'h264',
      });

    } catch (error) {
      logger.error('Failed to start recording', { error });
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!camera.current || !isRecording) return;

    try {
      await camera.current.stopRecording();
      setIsRecording(false);

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
          // Move to next phase
          const nextIndex = currentPhaseIndex + 1;
          if (nextIndex < VideoService.guidancePhases.length) {
            setCurrentPhaseIndex(nextIndex);
            // Flash guidance for new phase
            guidanceOpacity.value = withSequence(
              withTiming(0, { duration: 200 }),
              withTiming(1, { duration: 200 })
            );
            return 0;
          }
        }

        // Update progress animation
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
      // Compress video
      const compressedPath = capturedVideo.path.replace('.mp4', '_compressed.mp4');
      const compressionResult = await VideoService.compressVideo(
        capturedVideo.path,
        compressedPath
      );

      if (!compressionResult.success) {
        throw new Error('Video compression failed');
      }

      // Queue for upload and processing
      const videoId = await VideoService.queueVideo(
        compressionResult.outputPath,
        compressionResult.metadata,
        {
          assessmentId,
          propertyId,
        }
      );

      logger.info('Video queued for processing', { videoId });

      // Navigate to processing status screen
      navigation.navigate('VideoProcessingStatus', {
        videoId,
        assessmentId,
        propertyId,
      });

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
            onPress={checkPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>No camera device found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && !showPreview && (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={true}
          video={true}
          audio={true}
          enableZoomGesture={true}
          orientation="portrait"
          onInitialized={() => setIsInitialized(true)}
        />
      )}

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
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
              onPress={() => camera.current?.toggleTorch()}
            >
              <Icon name="flash-on" size={28} color="white" />
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
            {/* Video player would go here */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    color: '#333',
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  helpButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  timerContainer: {
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  guidanceOverlay: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 5,
  },
  guidanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  guidanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  phaseTimer: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  instructionsList: {
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  instructionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#795548',
    flex: 1,
  },
  phaseIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  phaseIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  phaseIndicatorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  phaseIndicatorComplete: {
    backgroundColor: '#4CAF50',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
  },
  recordButtonStop: {
    borderRadius: 8,
    width: 32,
    height: 32,
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  previewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  videoPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  retakeButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  uploadProgress: {
    marginLeft: 8,
    fontSize: 14,
    color: 'white',
  },
});

export default VideoCaptureScreen;