import { z } from 'zod';

// ============================================================================
// REAL-TIME EVENT SCHEMAS
// ============================================================================

const RealTimeEventSchema = z.object({
  type: z.enum([
    'job_created',
    'job_updated', 
    'bid_received',
    'message_received',
    'notification_sent',
    'user_online',
    'user_offline',
  ]),
  payload: z.any(),
  timestamp: z.number(),
  userId: z.string().optional(),
});

export type RealTimeEvent = z.infer<typeof RealTimeEventSchema>;

export type EventListener<T = any> = (data: T) => void;

export interface RealTimeEventHandlers {
  onJobCreated?: EventListener<{ job: any }>;
  onJobUpdated?: EventListener<{ job: any; changes: any }>;
  onBidReceived?: EventListener<{ bid: any; job: any }>;
  onMessageReceived?: EventListener<{ message: any; conversation: any }>;
  onNotificationSent?: EventListener<{ notification: any }>;
  onUserOnline?: EventListener<{ userId: string; userInfo: any }>;
  onUserOffline?: EventListener<{ userId: string }>;
  onConnectionChange?: EventListener<{ connected: boolean; latency?: number }>;
  onError?: EventListener<{ error: string; code?: string }>;
}

// ============================================================================
// REAL-TIME SERVICE CLASS
// ============================================================================

export class RealTimeService {
  private eventHandlers: RealTimeEventHandlers = {};
  private isConnected = false;
  private currentUserId: string | null = null;
  private mockSocket: any = null;

  async initialize(userId: string, token: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🔗 Initializing real-time service for user:', userId);
    
    // Mock WebSocket connection for development
    this.mockSocket = {
      connected: true,
      emit: (event: string, data: any) => {
        console.log('📤 Emitting event:', event, data);
      },
      on: (event: string, handler: Function) => {
        console.log('👂 Listening for event:', event);
      },
      disconnect: () => {
        console.log('🔌 Disconnecting mock socket');
        this.isConnected = false;
      }
    };

    this.isConnected = true;
    this.eventHandlers.onConnectionChange?.({ connected: true });
  }

  setEventHandlers(handlers: RealTimeEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  // Simulate real-time events for development
  simulateJobCreated(job: any): void {
    console.log('📡 Simulating job created event');
    this.eventHandlers.onJobCreated?.({ job });
  }

  simulateJobUpdated(job: any, changes: any): void {
    console.log('📡 Simulating job updated event');
    this.eventHandlers.onJobUpdated?.({ job, changes });
  }

  simulateBidReceived(bid: any, job: any): void {
    console.log('📡 Simulating bid received event');
    this.eventHandlers.onBidReceived?.({ bid, job });
  }

  simulateMessageReceived(message: any, conversation: any): void {
    console.log('📡 Simulating message received event');
    this.eventHandlers.onMessageReceived?.({ message, conversation });
  }

  simulateNotification(notification: any): void {
    console.log('📡 Simulating notification event');
    this.eventHandlers.onNotificationSent?.({ notification });
  }

  // Public methods for WebSocket operations
  emitTypingStart(conversationId: string): void {
    this.mockSocket?.emit('typing:start', { conversationId });
  }

  emitTypingStop(conversationId: string): void {
    this.mockSocket?.emit('typing:stop', { conversationId });
  }

  emitUserPresence(status: 'online' | 'away' | 'busy'): void {
    this.mockSocket?.emit('user:presence', { status });
  }

  joinJobRoom(jobId: string): void {
    this.mockSocket?.emit('join:job', { jobId });
  }

  leaveJobRoom(jobId: string): void {
    this.mockSocket?.emit('leave:job', { jobId });
  }

  joinConversationRoom(conversationId: string): void {
    this.mockSocket?.emit('join:conversation', { conversationId });
  }

  leaveConversationRoom(conversationId: string): void {
    this.mockSocket?.emit('leave:conversation', { conversationId });
  }

  async disconnect(): Promise<void> {
    this.mockSocket?.disconnect();
    this.isConnected = false;
    this.currentUserId = null;
    this.eventHandlers.onConnectionChange?.({ connected: false });
  }

  getConnectionStatus(): { connected: boolean; latency?: number } {
    return { 
      connected: this.isConnected,
      latency: this.isConnected ? 50 : undefined // Mock latency
    };
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let realTimeServiceInstance: RealTimeService | null = null;

export const getRealTimeService = (): RealTimeService => {
  if (!realTimeServiceInstance) {
    realTimeServiceInstance = new RealTimeService();
  }
  return realTimeServiceInstance;
};

export default RealTimeService;