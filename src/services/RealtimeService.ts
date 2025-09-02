import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../utils/logger';


export type RealtimeCallback = (payload: any) => void;

export class RealtimeService {
  private static channels: Map<string, RealtimeChannel> = new Map();

  // Subscribe to job updates
  static subscribeToJobUpdates(jobId: string, callback: RealtimeCallback): () => void {
    const channelName = `job_updates_${jobId}`;
    
    // Remove existing subscription if any
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      }, callback)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bids',
        filter: `job_id=eq.${jobId}`
      }, callback)
      .subscribe();

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  // Subscribe to contractor's bid updates
  static subscribeToContractorBids(contractorId: string, callback: RealtimeCallback): () => void {
    const channelName = `contractor_bids_${contractorId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bids',
        filter: `contractor_id=eq.${contractorId}`
      }, callback)
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to homeowner's job updates
  static subscribeToHomeownerJobs(homeownerId: string, callback: RealtimeCallback): () => void {
    const channelName = `homeowner_jobs_${homeownerId}`;
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `homeowner_id=eq.${homeownerId}`
      }, callback)
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to new available jobs (for contractors)
  static subscribeToAvailableJobs(callback: RealtimeCallback): () => void {
    const channelName = 'available_jobs';
    
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'jobs',
        filter: 'status=eq.posted'
      }, callback)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: 'status=eq.posted'
      }, callback)
      .subscribe();

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  // Unsubscribe from a specific channel
  static unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Unsubscribe from all channels
  static unsubscribeAll(): void {
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
  }

  // Get connection status
  static getConnectionStatus(): string {
    // This is a simplified status check
    return supabase.realtime.isConnected() ? 'connected' : 'disconnected';
  }

  // Manual reconnect
  static reconnect(): void {
    // Resubscribe to all existing channels
    const existingChannels = Array.from(this.channels.keys());
    
    // Clear current channels
    this.unsubscribeAll();
    
    // Note: In a real implementation, you'd need to store callback references
    // to properly resubscribe. This is a simplified version.
    logger.debug('Realtime reconnection initiated for channels:', { data: existingChannels });
  }
}