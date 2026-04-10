import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './videoCallInterfaceStyles';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

interface VideoCallControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  speakerOn: boolean;
  screenSharing: boolean;
  isRecording: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onEndCall: () => void;
  onSwitchCamera: () => void;
}

const VideoCallControls: React.FC<VideoCallControlsProps> = ({
  audioEnabled,
  videoEnabled,
  speakerOn,
  screenSharing,
  isRecording,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onToggleScreenShare,
  onToggleRecording,
  onEndCall,
  onSwitchCamera,
}) => {
  return (
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.8)']}
      style={styles.bottomOverlay}
    >
      <View style={styles.controlsContainer}>
        {/* Primary controls */}
        <View style={styles.primaryControls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              !audioEnabled && styles.controlButtonDisabled,
            ]}
            onPress={onToggleAudio}
          >
            <Ionicons
              name={audioEnabled ? 'mic' : 'mic-off'}
              size={24}
              color={audioEnabled ? theme.colors.surface : theme.colors.error}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              !videoEnabled && styles.controlButtonDisabled,
            ]}
            onPress={onToggleVideo}
          >
            <Ionicons
              name={videoEnabled ? 'videocam' : 'videocam-off'}
              size={24}
              color={videoEnabled ? theme.colors.surface : theme.colors.error}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={onEndCall}>
            <Ionicons name='call' size={28} color={theme.colors.textInverse} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              speakerOn && styles.controlButtonActive,
            ]}
            onPress={onToggleSpeaker}
          >
            <Ionicons
              name={speakerOn ? 'volume-high' : 'volume-low'}
              size={24}
              color={theme.colors.textInverse}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={onSwitchCamera}
          >
            <Ionicons
              name='camera-reverse'
              size={24}
              color={theme.colors.textInverse}
            />
          </TouchableOpacity>
        </View>

        {/* Secondary controls */}
        <View style={styles.secondaryControls}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              screenSharing && styles.secondaryButtonActive,
            ]}
            onPress={onToggleScreenShare}
          >
            <Ionicons
              name='desktop'
              size={20}
              color={
                screenSharing
                  ? theme.colors.textPrimary
                  : theme.colors.textInverse
              }
            />
            <Text
              style={[
                styles.secondaryButtonText,
                screenSharing && styles.secondaryButtonTextActive,
              ]}
            >
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              isRecording && styles.secondaryButtonActive,
            ]}
            onPress={onToggleRecording}
          >
            <Ionicons
              name='recording'
              size={20}
              color={
                isRecording ? theme.colors.error : theme.colors.textInverse
              }
            />
            <Text
              style={[
                styles.secondaryButtonText,
                isRecording && styles.secondaryButtonTextActive,
              ]}
            >
              Record
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

export default VideoCallControls;
