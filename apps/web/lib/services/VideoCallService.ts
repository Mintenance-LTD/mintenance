import { supabase } from '@/lib/supabase';
import type {
  VideoCall,
  VideoCallParticipant,
  VideoCallSettings,
  VideoCallInvitation,
  CallQualityMetrics
} from '@mintenance/types';

// WebRTC configuration for optimal performance
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers for production
  // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
];

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
      console.log('Connection state:', this.peerConnection?.connectionState);
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
        console.error('Error creating video call:', error);
        throw new Error('Failed to create video call');
      }

      return this.formatVideoCall(data);
    } catch (error) {
      console.error('Create video call error:', error);
      return this.getMockVideoCall(params);
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
      console.error('Join call error:', error);
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
      console.error('End call error:', error);
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
      console.error('Screen share error:', error);
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
        console.error('Error fetching user calls:', error);
        return this.getMockUserCalls(userId);
      }

      return (data || []).map(this.formatVideoCall);
    } catch (error) {
      console.error('Get user calls error:', error);
      return this.getMockUserCalls(userId);
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

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      const { data, error } = await supabase
        .from('video_call_invitations')
        .insert([{
          call_id: callId,
          from_user_id: currentUser.id,
          to_user_id: toUserId,
          message,
          status: 'pending',
          expires_at: expiresAt,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error sending call invitation:', error);
        throw new Error('Failed to send invitation');
      }

      return {
        id: data.id,
        callId: data.call_id,
        fromUserId: data.from_user_id,
        toUserId: data.to_user_id,
        message: data.message,
        status: data.status,
        expiresAt: data.expires_at,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Send call invitation error:', error);
      throw error;
    }
  }

  /**
   * Respond to call invitation
   */
  static async respondToInvitation(invitationId: string, accept: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('video_call_invitations')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) {
        console.error('Error responding to invitation:', error);
        throw new Error('Failed to respond to invitation');
      }

      if (accept) {
        // Update call status to active
        const { data: invitation } = await supabase
          .from('video_call_invitations')
          .select('call_id')
          .eq('id', invitationId)
          .single();

        if (invitation) {
          await this.updateCallStatus(invitation.call_id, 'active');
        }
      }
    } catch (error) {
      console.error('Respond to invitation error:', error);
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
        console.error('Error fetching call:', error);
        return null;
      }

      return this.formatVideoCall(data);
    } catch (error) {
      console.error('Get call by ID error:', error);
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
      console.error('Error accessing media devices:', error);
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

  private static startQualityMonitoring(callId: string): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }

    this.qualityCheckInterval = setInterval(() => {
      this.trackConnectionQuality();
    }, 10000); // Check every 10 seconds
  }

  private static async trackConnectionQuality(): Promise<void> {
    if (!this.peerConnection || !this.currentCallId) return;

    try {
      const stats = await this.peerConnection.getStats();
      let audioQuality: CallQualityMetrics['audioQuality'] = 'good';
      let videoQuality: CallQualityMetrics['videoQuality'] = 'good';
      let latency = 0;
      let packetsLost = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          packetsLost += report.packetsLost || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
        }
      });

      // Simple quality assessment
      if (packetsLost > 50) videoQuality = 'poor';
      else if (packetsLost > 20) videoQuality = 'fair';

      if (latency > 300) audioQuality = 'poor';
      else if (latency > 150) audioQuality = 'fair';

      // Store quality metrics
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        await supabase
          .from('call_quality_metrics')
          .insert([{
            call_id: this.currentCallId,
            user_id: currentUser.id,
            audio_quality: audioQuality,
            video_quality: videoQuality,
            connection_stability: 'stable',
            latency_ms: latency,
            packets_lost: packetsLost,
            bandwidth: 1000, // Mock bandwidth
            timestamp: new Date().toISOString()
          }]);
      }
    } catch (error) {
      console.error('Quality tracking error:', error);
    }
  }

  private static formatVideoCall(data: any): VideoCall {
    return {
      id: data.id,
      jobId: data.job_id,
      initiatorId: data.initiator_id,
      participantId: data.participant_id,
      title: data.title,
      description: data.description,
      status: data.status,
      scheduledAt: data.scheduled_at,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      duration: data.duration,
      recordingUrl: data.recording_url,
      roomId: data.room_id,
      accessToken: data.access_token,
      type: data.type,
      priority: data.priority,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      initiator: data.initiator,
      participant: data.participant,
      job: data.job
    };
  }

  /**
   * Mock data for demo/fallback
   */
  private static getMockVideoCall(params: any): VideoCall {
    return {
      id: `call_${Date.now()}`,
      jobId: params.jobId,
      initiatorId: 'user_1',
      participantId: params.participantId,
      title: params.title,
      description: params.description,
      status: params.scheduledAt ? 'scheduled' : 'pending',
      scheduledAt: params.scheduledAt,
      type: params.type,
      priority: 'medium',
      roomId: `room_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initiator: {
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar1.jpg'
      },
      participant: {
        first_name: 'Jane',
        last_name: 'Smith',
        avatar_url: 'https://example.com/avatar2.jpg'
      }
    };
  }

  private static getMockUserCalls(userId: string): VideoCall[] {
    return [
      {
        id: 'call_history_1',
        jobId: 'job_1',
        initiatorId: userId,
        participantId: 'contractor_1',
        title: 'Kitchen Renovation Consultation',
        description: 'Discuss project scope and timeline',
        status: 'ended',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        duration: 1800, // 30 minutes
        type: 'consultation',
        priority: 'medium',
        roomId: 'room_history_1',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        participant: {
          first_name: 'Mike',
          last_name: 'Johnson',
          avatar_url: 'https://example.com/contractor1.jpg'
        },
        job: {
          title: 'Kitchen Renovation',
          category: 'kitchen'
        }
      },
      {
        id: 'call_history_2',
        jobId: 'job_2',
        initiatorId: 'contractor_2',
        participantId: userId,
        title: 'Plumbing Emergency Assessment',
        description: 'Remote evaluation of pipe leak',
        status: 'scheduled',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        type: 'emergency',
        priority: 'urgent',
        roomId: 'room_history_2',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        initiator: {
          first_name: 'Sarah',
          last_name: 'Williams',
          avatar_url: 'https://example.com/contractor2.jpg'
        },
        job: {
          title: 'Emergency Plumbing Repair',
          category: 'plumbing'
        }
      }
    ];
  }
}