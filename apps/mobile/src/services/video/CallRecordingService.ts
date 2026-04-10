import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import {
  handleDatabaseOperation,
  validateRequired,
} from '../../utils/serviceHelper';
import { performanceMonitor } from '../../utils/performance';
import { transformVideoCallData } from './VideoCallHelpers';
import type { VideoCall, CallStatistics, DatabaseVideoCallRow } from './types';

export async function getCallHistory(jobId: string): Promise<VideoCall[]> {
  return performanceMonitor.measureAsync(
    'get_call_history',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'getCallHistory',
        params: { jobId },
      };
      validateRequired(jobId, 'jobId', context);
      return handleDatabaseOperation(async () => {
        const result = await supabase
          .from('video_calls')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });
        if (result.error)
          throw new Error(
            `Failed to get call history: ${result.error.message}`
          );
        const calls = ((result.data as DatabaseVideoCallRow[]) || []).map(
          (call) => transformVideoCallData(call)
        );
        return { data: calls, error: null };
      }, context);
    },
    'network'
  );
}

export async function startRecording(
  callId: string,
  userId: string
): Promise<void> {
  await performanceMonitor.measureAsync(
    'start_call_recording',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'startRecording',
        params: { callId, userId },
      };

      return handleDatabaseOperation(async () => {
        const result = await supabase
          .from('video_calls')
          .update({
            recording_enabled: true,
            metadata: {
              recordingStartedBy: userId,
              recordingStartedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', callId);

        if (result.error)
          throw new Error(`Failed to start recording: ${result.error.message}`);

        logger.info('Call recording started', { callId, startedBy: userId });

        return { data: null, error: null };
      }, context);
    },
    'network'
  );
}

/**
 * Stop an active recording for the given call.
 * Sets recording_enabled to false and stores the stop timestamp.
 * Returns the recording URL if one was generated (placeholder until
 * a real media-server integration stores the file).
 */
export async function stopRecording(
  callId: string,
  userId: string
): Promise<string | undefined> {
  return performanceMonitor.measureAsync(
    'stop_call_recording',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'stopRecording',
        params: { callId, userId },
      };

      return handleDatabaseOperation(async () => {
        // Fetch current metadata so we can preserve existing fields
        const existing = await supabase
          .from('video_calls')
          .select('metadata')
          .eq('id', callId)
          .single();

        const currentMetadata =
          (existing.data as Pick<DatabaseVideoCallRow, 'metadata'>)?.metadata ||
          {};

        const result = await supabase
          .from('video_calls')
          .update({
            recording_enabled: false,
            metadata: {
              ...currentMetadata,
              recordingStoppedBy: userId,
              recordingStoppedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', callId)
          .select('recording_url')
          .single();

        if (result.error)
          throw new Error(`Failed to stop recording: ${result.error.message}`);

        const recordingUrl =
          (result.data as { recording_url?: string })?.recording_url ||
          undefined;

        logger.info('Call recording stopped', {
          callId,
          stoppedBy: userId,
          recordingUrl,
        });

        return { data: recordingUrl, error: null };
      }, context);
    },
    'network'
  );
}

export async function getCallStatistics(
  callId: string
): Promise<CallStatistics> {
  return performanceMonitor.measureAsync(
    'get_call_statistics',
    async () => {
      const context = {
        service: 'VideoCallService',
        method: 'getCallStatistics',
        params: { callId },
      };

      return handleDatabaseOperation(async () => {
        const stats: CallStatistics = {
          callId,
          duration: 0,
          averageQuality: 'good',
          packetsLost: 0,
          bandwidthUsed: 0,
          reconnections: 0,
          participantStats: [],
        };

        return { data: stats, error: null };
      }, context);
    },
    'network'
  );
}
