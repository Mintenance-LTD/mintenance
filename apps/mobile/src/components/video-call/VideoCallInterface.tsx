import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  SafeAreaView,
  BackHandler,
  Platform,
} from 'react-native';
import { styles } from './videoCallInterfaceStyles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';
import { haptics } from '../../utils/haptics';
import { VideoCallService, VideoCall, CallSession, CallParticipant } from '../../services/VideoCallService';
import { useAuth } from '../../contexts/AuthContext';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { logger } from '../../utils/logger';

// Temporary mock for Camera until expo-camera is installed
const Camera = {
  Constants: {
    Type: {
      front: 'front',
      back: 'back'
    }
  },
  requestCameraPermissionsAsync: () => Promise.resolve({ granted: false })
};

// Temporary mock for Audio until expo-av is installed
const Audio = {
  requestPermissionsAsync: () => Promise.resolve({ granted: false }),
  setAudioModeAsync: () => Promise.resolve()
};

interface VideoCallInterfaceProps {
  callId: string;
  onCallEnd: () => void;
  onCallError?: (error: string) => void;
  initialMuted?: boolean;
  initialVideoOff?: boolean;
  jobId?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  callId,
  onCallEnd,
  onCallError,
  initialMuted = false,
  initialVideoOff = false,
  jobId,
}) => {
  const { user } = useAuth();
  // State management
  const [callData, setCallData] = useState<VideoCall | null>(null);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(!initialMuted);
  const [videoEnabled, setVideoEnabled] = useState(!initialVideoOff);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [showControls, setShowControls] = useState(true);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Refs
  const localVideoRef = useRef<Camera>(null);
  const callStartTime = useRef<number>(Date.now());
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const performanceStartTime = useRef<number>(Date.now());

  useEffect(() => {
    initializeCall();
    setupBackHandler();
    return () => {
      cleanup();
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (isCallActive) {
      callStartTime.current = Date.now();
      durationInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isCallActive]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && isCallActive) {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls, isCallActive]);

  const initializeCall = useCallback(async () => {
    try {
      performanceMonitor.startMeasurement('video_call_initialization');

      // Request permissions
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const audioPermission = await Audio.requestPermissionsAsync();

      if (!cameraPermission.granted || !audioPermission.granted) {
        onCallError?.('Camera and microphone permissions are required for video calls');
        return;
      }

      setHasPermissions(true);

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !speakerOn,
      });

      // Get call data
      const call = VideoCallService.getActiveCall();
      if (call?.id === callId) {
        setCallData(call);
        setParticipants(call.participants);
      }

      // Join the call
      const session = await VideoCallService.joinCall(callId, user?.id || '');
      setCallSession(session);
      setIsConnecting(false);
      setIsCallActive(true);

      // Subscribe to call updates
      VideoCallService.subscribeToCallUpdates(callId, (updatedCall) => {
        setCallData(updatedCall);
        setParticipants(updatedCall.participants);

        if (updatedCall.status === 'ended') {
          setIsCallActive(false);
          performanceMonitor.endMeasurement('video_call_duration');
          onCallEnd();
        }
      });

      performanceMonitor.endMeasurement('video_call_initialization');
      logger.info('Video call initialized successfully', { callId, userId: user?.id });
    } catch (error) {
      logger.error('Failed to initialize video call:', error);
      onCallError?.('Failed to join the video call. Please try again.');
    }
  }, [callId, user?.id, speakerOn, onCallEnd, onCallError]);

  const toggleAudio = useCallback(async () => {
    try {
      await haptics.impact('light');
      const newMutedState = !audioEnabled;
      setAudioEnabled(!audioEnabled);

      await VideoCallService.toggleMute(callId, user?.id || '', !newMutedState);
      logger.info('Audio toggled', { enabled: !audioEnabled });
    } catch (error) {
      logger.error('Failed to toggle audio:', error);
    }
  }, [audioEnabled, callId, user?.id]);

  const toggleVideo = useCallback(async () => {
    try {
      await haptics.impact('light');
      const newVideoState = !videoEnabled;
      setVideoEnabled(newVideoState);

      await VideoCallService.toggleVideo(callId, user?.id || '', !newVideoState);
      logger.info('Video toggled', { enabled: newVideoState });
    } catch (error) {
      logger.error('Failed to toggle video:', error);
    }
  }, [videoEnabled, callId, user?.id]);

  const toggleSpeaker = useCallback(async () => {
    try {
      await haptics.impact('light');
      const newSpeakerState = !speakerOn;
      setSpeakerOn(newSpeakerState);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: !newSpeakerState,
      });

      logger.info('Speaker toggled', { speakerOn: newSpeakerState });
    } catch (error) {
      logger.error('Failed to toggle speaker:', error);
    }
  }, [speakerOn]);

  const toggleRecording = useCallback(async () => {
    try {
      await haptics.impact('medium');

      if (!isRecording) {
        Alert.alert(
          'Start Recording',
          'This will record the entire call. All participants will be notified.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Start Recording',
              onPress: async () => {
                await VideoCallService.startRecording(callId, user?.id || '');
                setIsRecording(true);
                logger.info('Call recording started');
              }
            }
          ]
        );
      } else {
        const recordingUrl = await VideoCallService.stopRecording(callId, user?.id || '');
        setIsRecording(false);
        logger.info('Call recording stopped', { recordingUrl });

        Alert.alert(
          'Recording Saved',
          'The call recording has been saved and will be available in your call history.'
        );
      }
    } catch (error) {
      logger.error('Failed to toggle recording:', error);
      Alert.alert('Error', 'Failed to toggle recording.');
    }
  }, [isRecording, callId, user?.id]);

  const endCall = useCallback(async () => {
    try {
      await haptics.impact('heavy');
      performanceMonitor.startMeasurement('video_call_end');

      setIsCallActive(false);
      await VideoCallService.endCall(callId, user?.id || '');

      performanceMonitor.endMeasurement('video_call_end');
      performanceMonitor.endMeasurement('video_call_duration');

      logger.info('Video call ended by user', {
        callId,
        duration: callDuration,
        userId: user?.id
      });

      onCallEnd();
    } catch (error) {
      logger.error('Failed to end call:', error);
      onCallEnd(); // End anyway
    }
  }, [callId, user?.id, callDuration, onCallEnd]);

  const toggleScreenShare = useCallback(async () => {
    try {
      await haptics.impact('medium');
      const newScreenShareState = !screenSharing;
      setScreenSharing(newScreenShareState);

      if (newScreenShareState) {
        await VideoCallService.startScreenShare(callId, user?.id || '');
        Alert.alert('Screen Sharing', 'Screen sharing has been started');
      } else {
        await VideoCallService.stopScreenShare(callId, user?.id || '');
      }

      logger.info('Screen share toggled', { screenShare: newScreenShareState });
    } catch (error) {
      logger.error('Failed to toggle screen share:', error);
      Alert.alert('Error', 'Failed to toggle screen sharing');
    }
  }, [screenSharing, callId, user?.id]);

  const switchCamera = useCallback(async () => {
    try {
      await haptics.impact('light');
      const newCameraType = cameraType === Camera.Constants.Type.front
        ? Camera.Constants.Type.back
        : Camera.Constants.Type.front;

      setCameraType(newCameraType);
      logger.info('Camera flipped', { cameraType: newCameraType });
    } catch (error) {
      logger.error('Error flipping camera:', error);
    }
  }, [cameraType]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
  }, []);

  const setupBackHandler = useCallback(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'End Call',
        'Are you sure you want to end this call?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End Call', onPress: endCall, style: 'destructive' }
        ]
      );
      return true;
    });

    return () => backHandler.remove();
  }, [endCall]);

  const formatDuration = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getQualityColor = (): string => {
    switch (connectionQuality) {
      case 'excellent': return theme.colors.success;
      case 'good': return theme.colors.primary;
      case 'fair': return theme.colors.warning;
      case 'poor': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const cleanup = useCallback(async () => {
    try {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }

      if (callData && isCallActive) {
        await VideoCallService.endCall(callId, user?.id || '');
      }

      // Reset audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        playThroughEarpieceAndroid: true,
        staysActiveInBackground: false,
      });
    } catch (error) {
      logger.error('Error during call cleanup:', error);
    }
  }, [callData, isCallActive, callId, user?.id]);

  if (!hasPermissions) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="videocam-off" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.permissionTitle}>Camera and Microphone Access Required</Text>
          <Text style={styles.permissionMessage}>
            Please grant camera and microphone permissions to join the video call.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={onCallEnd}>
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.connectingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.connectingText}>Connecting to call...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Video Views */}
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={showControlsTemporarily}
      >
        {/* Remote Video (Full Screen) */}
        <View style={styles.remoteVideoContainer}>
          {videoEnabled ? (
            <View style={styles.remoteVideo}>
              <Text style={styles.videoPlaceholder}>
                {participants.find(p => p.userId !== user?.id)?.displayName || 'Remote Video'}
              </Text>
            </View>
          ) : (
            <View style={styles.videoDisabled}>
              <Ionicons name="videocam-off" size={60} color={theme.colors.surface} />
              <Text style={styles.videoDisabledText}>Video disabled</Text>
            </View>
          )}
        </View>

        {/* Local Video (Picture-in-Picture) */}
        <View style={styles.localVideoContainer}>
          {videoEnabled && hasPermissions ? (
            <View style={styles.localVideo}>
              <View style={styles.localVideoDisabled}>
                <Ionicons name="videocam" size={30} color={theme.colors.surface} />
                <Text style={styles.videoPlaceholderSmall}>Camera Unavailable</Text>
              </View>
            </View>
          ) : (
            <View style={styles.localVideoDisabled}>
              <Ionicons name="person" size={30} color={theme.colors.surface} />
            </View>
          )}
          <View style={styles.pipLabel}>
            <Text style={styles.pipLabelText}>You</Text>
          </View>
          <TouchableOpacity style={styles.switchCameraButton} onPress={switchCamera}>
            <Ionicons name="camera-reverse" size={20} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>

        {/* Call Info Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.topOverlay}
        >
          <View style={styles.callInfo}>
            <View style={styles.callDetails}>
              <Text style={styles.participantName}>
                {participants.find(p => p.userId !== user?.id)?.displayName || 'Unknown'}
              </Text>
              <View style={styles.durationContainer}>
                <View style={[styles.qualityIndicator, { backgroundColor: getQualityColor() }]} />
                <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
              </View>
            </View>

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>REC</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Bottom controls */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomOverlay}
      >
        <View style={styles.controlsContainer}>
          {/* Primary controls */}
          <View style={styles.primaryControls}>
            <TouchableOpacity
              style={[styles.controlButton, !audioEnabled && styles.controlButtonDisabled]}
              onPress={toggleAudio}
            >
              <Ionicons
                name={audioEnabled ? 'mic' : 'mic-off'}
                size={24}
                color={audioEnabled ? theme.colors.surface : theme.colors.error}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, !videoEnabled && styles.controlButtonDisabled]}
              onPress={toggleVideo}
            >
              <Ionicons
                name={videoEnabled ? 'videocam' : 'videocam-off'}
                size={24}
                color={videoEnabled ? theme.colors.surface : theme.colors.error}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
              <Ionicons name="call" size={28} color={theme.colors.surface} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, speakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}
            >
              <Ionicons
                name={speakerOn ? 'volume-high' : 'volume-low'}
                size={24}
                color={theme.colors.surface}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={24} color={theme.colors.surface} />
            </TouchableOpacity>
          </View>

          {/* Secondary controls */}
          <View style={styles.secondaryControls}>
            <TouchableOpacity
              style={[styles.secondaryButton, screenSharing && styles.secondaryButtonActive]}
              onPress={toggleScreenShare}
            >
              <Ionicons
                name="desktop"
                size={20}
                color={screenSharing ? theme.colors.primary : theme.colors.surface}
              />
              <Text style={[
                styles.secondaryButtonText,
                screenSharing && styles.secondaryButtonTextActive
              ]}>
                Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, isRecording && styles.secondaryButtonActive]}
              onPress={toggleRecording}
            >
              <Ionicons
                name="recording"
                size={20}
                color={isRecording ? theme.colors.error : theme.colors.surface}
              />
              <Text style={[
                styles.secondaryButtonText,
                isRecording && styles.secondaryButtonTextActive
              ]}>
                Record
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};


export default VideoCallInterface;