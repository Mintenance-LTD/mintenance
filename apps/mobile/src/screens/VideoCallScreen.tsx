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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoCallService, CallSession, CallParticipant } from '../services/VideoCallService';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';

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
  navigation: { goBack: () => void };
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
      const participants = [contractorId, clientId].filter(Boolean);
      const call = await VideoCallService.startInstantCall(
        jobId ?? '',
        user?.id ?? clientId,
        participants,
        type,
      );
      setCallSession(call as unknown as CallSession);
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
      await VideoCallService.endCall(callSession?.callId ?? '', user?.id ?? '');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to end call properly.');
      navigation.goBack();
    }
  };

  const handleToggleMicrophone = () => {
    setIsMuted(prev => !prev);
  };

  const handleToggleCamera = () => {
    setIsVideoEnabled(prev => !prev);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerEnabled(prev => !prev);
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
            <View style={styles.connectingIconWrap}>
              <Ionicons name="videocam-outline" size={40} color={theme.colors.textInverse} />
            </View>
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
        <View style={styles.connectedChip}>
          <View style={styles.connectedDot} />
          <Text style={styles.callStatus}>Connected</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={handleToggleMicrophone}
          accessibilityRole='button'
          accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          accessibilityState={{ checked: !isMuted }}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
          onPress={handleToggleCamera}
          accessibilityRole='button'
          accessibilityLabel={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          accessibilityState={{ checked: isVideoEnabled }}
        >
          <Ionicons
            name={isVideoEnabled ? 'videocam' : 'videocam-off'}
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerEnabled && styles.controlButtonSpeaker]}
          onPress={handleToggleSpeaker}
          accessibilityRole='button'
          accessibilityLabel={isSpeakerEnabled ? 'Turn off speaker' : 'Turn on speaker'}
          accessibilityState={{ checked: isSpeakerEnabled }}
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
          accessibilityRole='button'
          accessibilityLabel='End call'
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
    backgroundColor: '#1A1A1A',
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingContent: {
    alignItems: 'center',
  },
  connectingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  connectingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: 8,
  },
  connectingSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333333',
  },
  localVideoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
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
    backgroundColor: '#2A2A2A',
    borderRadius: 24,
  },
  remoteVideoLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  callInfoContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  callDuration: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: 6,
  },
  connectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  callStatus: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: theme.colors.error,
  },
  controlButtonSpeaker: {
    backgroundColor: '#3B82F6',
  },
  endCallButton: {
    backgroundColor: theme.colors.error,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
});
