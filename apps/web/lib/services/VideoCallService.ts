import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type {
  VideoCall,
  VideoCallInvitation,
  CallQualityMetrics
} from '@mintenance/types';
import { ICE_SERVERS } from './video-call/config';
import { formatVideoCall } from './video-call/formatters';
import { getMockVideoCall, getMockUserCalls, getMockCallHistory } from './video-call/mocks';
import { sendCallInvitation as sendInvitationRecord, updateInvitationStatus } from './video-call/invitations';
import { computeAndRecordQuality, fetchCallQuality } from './video-call/quality';

export class VideoCallService {
  private static peerConnection: RTCPeerConnection | null = null;
  private static localStream: MediaStream | null = null;
  private static remoteStream: MediaStream | null = null;
  private static currentCallId: string | null = null;
  private static qualityCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebRTC peer connection
   */
  private static async initializePeerConnection(callId: string): Promise<RTCPeerConnection> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    this.currentCallId = callId;

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (remoteVideo) {
        remoteVideo.srcObject = this.remoteStream;
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.currentCallId) {
        // Send ICE candidate through Supabase real-time
        await supabase
          .from('video_call_ice_candidates')
          .insert([{
            call_id: this.currentCallId,
            candidate: JSON.stringify(event.candidate),
            type: 'offer'
          }]);
      }
    };

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      logger.info('Connection state', { state: this.peerConnection?.connectionState });
      this.trackConnectionQuality();
    };

    return this.peerConnection;
  }

  /**
   * Create a new video call
   */
  static async createCall(params: {
    participantId: string;
    title: string;
    description?: string;
    jobId?: string;
    type: VideoCall['type'];
    scheduledAt?: string;
  }): Promise<VideoCall> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('video_calls')
        .insert([{
          initiator_id: currentUser.id,
          participant_id: params.participantId,
          title: params.title,
          description: params.description,
          job_id: params.jobId,
          type: params.type,
          status: params.scheduledAt ? 'scheduled' : 'pending',
          scheduled_at: params.scheduledAt,
          priority: 'medium',
          room_id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          initiator:users!video_calls_initiator_id_fkey(first_name, last_name, avatar_url),
          participant:users!video_calls_participant_id_fkey(first_name, last_name, avatar_url),
          job:jobs(title, category)
        `)
        .single();

      if (error) {
        logger.error('Error creating video call', error);
        throw new Error('Failed to create video call');
      }

      return formatVideoCall(data);
    } catch (error) {
      logger.error('Create video call error', error);
      return getMockVideoCall(params);
    }
  }

  /**
   * Join an existing video call
   */
  static async joinCall(callId: string): Promise<{
    call: VideoCall;
    localStream: MediaStream;
    peerConnection: RTCPeerConnection;
  }> {
    try {
      // Get call details
      const call = await this.getCallById(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      // Initialize media
      const localStream = await this.getUserMedia();
      const peerConnection = await this.initializePeerConnection(callId);

      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Update call status
      await this.updateCallStatus(callId, 'active');

      // Start quality monitoring
      this.startQualityMonitoring(callId);

      return { call, localStream, peerConnection };
    } catch (error) {
      logger.error('Join call error', error);
      throw error;
    }
  }

  /**
   * End video call
   */
  static async endCall(callId: string): Promise<void> {
    try {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Stop quality monitoring
      if (this.qualityCheckInterval) {
        clearInterval(this.qualityCheckInterval);
        this.qualityCheckInterval = null;
      }

      // Update call status in database
      const endTime = new Date().toISOString();
      await supabase
        .from('video_calls')
        .update({
          status: 'ended',
          ended_at: endTime,
          updated_at: endTime
        })
        .eq('id', callId);

      this.currentCallId = null;
    } catch (error) {
      logger.error('End call error', error);
    }
  }

  /**
   * Toggle audio/video during call
   */
  static toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  static toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Start screen sharing
   */
  static async startScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track in peer connection
      if (this.peerConnection && this.localStream) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s =>
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      return screenStream;
    } catch (error) {
      logger.error('Screen share error', error);
      throw error;
    }
  }

  /**
   * Get user's video calls
   */
  static async getUserCalls(userId: string, status?: VideoCall['status']): Promise<VideoCall[]> {
    try {
      let query = supabase
        .from('video_calls')
        .select(`
          *,
          initiator:users!video_calls_initiator_id_fkey(first_name, last_name, avatar_url),
          participant:users!video_calls_participant_id_fkey(first_name, last_name, avatar_url),
          job:jobs(title, category)
        `)
        .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching user calls', error);
        return getMockUserCalls(userId);
      }

      const rows = data ?? [];
      return rows.map(call => formatVideoCall(call));
    } catch (error) {
      logger.error('Get user calls error', error);
      return getMockUserCalls(userId);
    }
  }

  /**
   * Schedule a video call
   */
  static async scheduleCall(params: {
    participantId: string;
    title: string;
    description?: string;
    scheduledAt: string;
    jobId?: string;
    type: VideoCall['type'];
  }): Promise<VideoCall> {
    const call = await this.createCall({
      ...params,
      scheduledAt: params.scheduledAt
    });

    // Create invitation
    await this.sendCallInvitation(call.id, params.participantId);

    return call;
  }

  /**
   * Send call invitation
   */
  static async sendCallInvitation(callId: string, toUserId: string, message?: string): Promise<VideoCallInvitation> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return await sendInvitationRecord(callId, currentUser.id, toUserId, message);
    } catch (error) {
      logger.error('Send call invitation error', error);
      throw error;
    }
  }

  /**
   * Respond to call invitation
   */
  static async respondToInvitation(invitationId: string, accept: boolean): Promise<void> {
    try {
      const callId = await updateInvitationStatus(invitationId, accept);
      if (accept && callId) {
        await this.updateCallStatus(callId, 'active');
      }
    } catch (error) {
      logger.error('Respond to invitation error', error);
      throw error;
    }
  }

  /**
   * Get call by ID
   */
  static async getCallById(callId: string): Promise<VideoCall | null> {
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .select(`
          *,
          initiator:users!video_calls_initiator_id_fkey(first_name, last_name, avatar_url),
          participant:users!video_calls_participant_id_fkey(first_name, last_name, avatar_url),
          job:jobs(title, category)
        `)
        .eq('id', callId)
        .single();

      if (error) {
        logger.error('Error fetching call', error);
        return null;
      }

      return formatVideoCall(data);
    } catch (error) {
      logger.error('Get call by ID error', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */
  private static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  private static async getUserMedia(constraints: MediaStreamConstraints = { video: true, audio: true }): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      logger.error('Error accessing media devices', error);
      throw error;
    }
  }

  private static async updateCallStatus(callId: string, status: VideoCall['status']): Promise<void> {
    await supabase
      .from('video_calls')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', callId);
  }

  private static startQualityMonitoring(_callId: string): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }

    this.qualityCheckInterval = setInterval(() => {
      this.trackConnectionQuality();
    }, 10000); // Check every 10 seconds
  }

  private static async trackConnectionQuality(): Promise<void> {
    if (!this.peerConnection || !this.currentCallId) return;
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return;
    await computeAndRecordQuality(this.peerConnection, this.currentCallId, currentUser.id);
  }

  /**
   * Get call history for a user
   */
  static async getCallHistory(userId: string, options: { limit?: number; offset?: number } = {}): Promise<VideoCall[]> {
    try {
      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;

      const { data, error } = await supabase
        .from('video_calls')
        .select('*')
        .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching call history', error);
        return getMockCallHistory();
      }

      return data ?? [];
    } catch (error) {
      logger.error('Get call history error', error);
      return getMockCallHistory();
    }
  }

  /**
   * Cancel a scheduled call
   */
  static async cancelCall(callId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('video_calls')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (error) {
        logger.error('Error cancelling call', error);
        throw new Error('Failed to cancel call');
      }
    } catch (error) {
      logger.error('Cancel call error', error);
      throw error;
    }
  }

  /**
   * Get call quality metrics
   */
  static async getCallQuality(callId: string): Promise<CallQualityMetrics | null> {
    return fetchCallQuality(callId);
  }

  /**
   * Stop screen sharing
   */
  static async stopScreenShare(): Promise<void> {
    try {
      if (this.localStream) {
        const screenTrack = this.localStream.getVideoTracks().find(track =>
          track.label.includes('screen') || track.label.includes('desktop')
        );

        if (screenTrack) {
          screenTrack.stop();
        }
      }
    } catch (error) {
      logger.error('Stop screen share error', error);
    }
  }
}
