/**
 * VideoCallScreen Component
 * 
 * Main video calling interface with participant management and controls.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { VideoCallService, CallSession, CallParticipant } from '../../services/VideoCallService';
import { useAuth } from '../../contexts/AuthContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoCallScreenProps {
  route: {
    params: {
      contractorId: string;
      clientId: string;
      type?: 'job_discussion' | 'consultation' | 'site_visit' | 'general';
      jobId?: string;
    };
  };
  navigation: any;
}

export const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  route,
  navigation,
}) => {
  const { user } = useAuth();
  const { contractorId, clientId, type = 'general', jobId } = route.params;
  
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const videoCallService = VideoCallService.getInstance();
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeCall();
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const initializeCall = async () => {
    try {
      await videoCallService.initialize();
      const session = await videoCallService.startCall(contractorId, clientId, type, jobId);
      setCallSession(session);
      setIsConnecting(false);
      startDurationTimer();
    } catch (error) {
      Alert.alert('Error', 'Failed to start video call. Please try again.');
      navigation.goBack();
    }
  };

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const handleEndCall = async () => {
    try {
      await videoCallService.endCall();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to end call properly.');
      navigation.goBack();
    }
  };

  const handleToggleMicrophone = () => {
    const newMutedState = videoCallService.toggleMicrophone();
    setIsMuted(newMutedState);
  };

  const handleToggleCamera = () => {
    const newVideoState = videoCallService.toggleCamera();
    setIsVideoEnabled(newVideoState);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerEnabled(prev => !prev);
    // Speaker toggle implementation would go here
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.connectingContainer}>
          <View style={styles.connectingContent}>
            <Ionicons name="videocam-outline" size={64} color={theme.colors.primary} />
            <Text style={styles.connectingTitle}>Connecting...</Text>
            <Text style={styles.connectingSubtitle}>
              Please wait while we connect your call
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Area */}
      <View style={styles.videoContainer}>
        <View style={styles.localVideoContainer}>
          <View style={styles.localVideoPlaceholder}>
            <Ionicons name="person" size={40} color={theme.colors.textInverse} />
            <Text style={styles.localVideoLabel}>You</Text>
          </View>
        </View>

        <View style={styles.remoteVideoContainer}>
          <View style={styles.remoteVideoPlaceholder}>
            <Ionicons name="person" size={60} color={theme.colors.textInverse} />
            <Text style={styles.remoteVideoLabel}>Contractor</Text>
          </View>
        </View>
      </View>

      {/* Call Info */}
      <View style={styles.callInfoContainer}>
        <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
        <Text style={styles.callStatus}>Connected</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={handleToggleMicrophone}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={24}
            color={isMuted ? theme.colors.error : theme.colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
          onPress={handleToggleCamera}
        >
          <Ionicons
            name={isVideoEnabled ? 'videocam' : 'videocam-off'}
            size={24}
            color={!isVideoEnabled ? theme.colors.error : theme.colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerEnabled && styles.controlButtonActive]}
          onPress={handleToggleSpeaker}
        >
          <Ionicons
            name={isSpeakerEnabled ? 'volume-high' : 'volume-low'}
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={24} color={theme.colors.textInverse} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingContent: {
    alignItems: 'center',
  },
  connectingTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  connectingSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textInverseMuted,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  localVideoContainer: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 120,
    height: 160,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  localVideoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textInverse,
    marginTop: theme.spacing.xs,
  },
  remoteVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoPlaceholder: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.xl,
  },
  remoteVideoLabel: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textInverse,
    marginTop: theme.spacing.md,
  },
  callInfoContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  callDuration: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
    marginBottom: theme.spacing.xs,
  },
  callStatus: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textInverseMuted,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  controlButtonActive: {
    backgroundColor: theme.colors.error,
  },
  endCallButton: {
    backgroundColor: theme.colors.error,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
});
