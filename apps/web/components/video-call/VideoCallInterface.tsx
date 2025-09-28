import React, { useState, useEffect, useRef } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VideoCallService } from '@/lib/services/VideoCallService';
import type { VideoCall, VideoCallParticipant, CallQualityMetrics } from '@mintenance/types';

interface VideoCallInterfaceProps {
  call: VideoCall;
  currentUserId: string;
  onEndCall?: () => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
}

export const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  call,
  currentUserId,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare
}) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<VideoCallParticipant[]>([]);
  const [callQuality, setCallQuality] = useState<CallQualityMetrics | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callStartTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    initializeCall();
    return () => {
      cleanup();
    };
  }, [call.id]);

  useEffect(() => {
    if (call.status === 'active' && !callStartTimeRef.current) {
      callStartTimeRef.current = new Date();
      startDurationTimer();
    }
  }, [call.status]);

  const initializeCall = async () => {
    try {
      setConnectionStatus('connecting');

      const isInitiator = currentUserId === call.initiatorId;

      if (isInitiator) {
        await VideoCallService.createCall({
          jobId: call.jobId,
          participantId: call.participantId,
          title: call.title,
          description: call.description,
          type: call.type
        });
      }

      await VideoCallService.joinCall(call.id);

      // Set up local video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setConnectionStatus('connected');

      // Monitor call quality
      startQualityMonitoring();

    } catch (error) {
      console.error('Failed to initialize call:', error);
      setConnectionStatus('disconnected');
    }
  };

  const cleanup = async () => {
    try {
      await VideoCallService.endCall(call.id);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const startDurationTimer = () => {
    const timer = setInterval(() => {
      if (callStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);

    return () => clearInterval(timer);
  };

  const startQualityMonitoring = () => {
    const monitor = setInterval(async () => {
      try {
        const quality = await VideoCallService.getCallQuality(call.id);
        setCallQuality(quality);
      } catch (error) {
        console.error('Quality monitoring error:', error);
      }
    }, 5000);

    return () => clearInterval(monitor);
  };

  const handleToggleAudio = async () => {
    try {
      VideoCallService.toggleAudio(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
      onToggleAudio?.();
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  };

  const handleToggleVideo = async () => {
    try {
      VideoCallService.toggleVideo(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
      onToggleVideo?.();
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await VideoCallService.stopScreenShare();
      } else {
        await VideoCallService.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
      onToggleScreenShare?.();
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await VideoCallService.endCall(call.id);
      onEndCall?.();
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return theme.colors.success;
      case 'connecting': return theme.colors.warning;
      case 'disconnected': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.backgroundDark,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: theme.spacing.lg,
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.white,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0
          }}>
            📹 {call.title}
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginTop: theme.spacing.xs
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Duration: {formatDuration(callDuration)}
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: getConnectionStatusColor()
              }} />
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: getConnectionStatusColor(),
                textTransform: 'capitalize'
              }}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Call Quality Indicator */}
        {callQuality && (
          <Card style={{
            padding: theme.spacing.sm,
            backgroundColor: `${theme.colors.info}10`,
            border: `1px solid ${theme.colors.info}`
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.info,
              textAlign: 'center'
            }}>
              📊 Quality: {callQuality.videoQuality} • {callQuality.latencyMs}ms
            </div>
          </Card>
        )}
      </div>

      {/* Video Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        backgroundColor: theme.colors.backgroundDark
      }}>
        {/* Remote Video (Main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: theme.colors.backgroundDark
          }}
        />

        {/* Local Video (Picture-in-Picture) */}
        <div style={{
          position: 'absolute',
          top: theme.spacing.lg,
          right: theme.spacing.lg,
          width: '240px',
          height: '180px',
          borderRadius: theme.borderRadius.lg,
          overflow: 'hidden',
          border: `2px solid ${theme.colors.white}`,
          backgroundColor: theme.colors.backgroundDark
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)' // Mirror local video
            }}
          />
          {!isVideoEnabled && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.backgroundDark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.white
            }}>
              📹
            </div>
          )}
        </div>

        {/* Participant Info */}
        <div style={{
          position: 'absolute',
          bottom: theme.spacing.lg,
          left: theme.spacing.lg,
          color: theme.colors.white,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            marginBottom: theme.spacing.xs
          }}>
            {call.participant?.first_name} {call.participant?.last_name}
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            opacity: 0.8
          }}>
            {call.job?.title && `📋 ${call.job.title}`}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.white,
        borderTop: `1px solid ${theme.colors.border}`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.md
      }}>
        {/* Audio Toggle */}
        <button
          onClick={handleToggleAudio}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isAudioEnabled ? theme.colors.success : theme.colors.error,
            color: theme.colors.white,
            fontSize: theme.typography.fontSize.xl,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>

        {/* Video Toggle */}
        <button
          onClick={handleToggleVideo}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isVideoEnabled ? theme.colors.success : theme.colors.error,
            color: theme.colors.white,
            fontSize: theme.typography.fontSize.xl,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={handleToggleScreenShare}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isScreenSharing ? theme.colors.info : theme.colors.backgroundSecondary,
            color: isScreenSharing ? theme.colors.white : theme.colors.text,
            fontSize: theme.typography.fontSize.xl,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        >
          🖥️
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: theme.colors.error,
            color: theme.colors.white,
            fontSize: theme.typography.fontSize.xl,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="End Call"
        >
          📞
        </button>
      </div>
    </div>
  );
};