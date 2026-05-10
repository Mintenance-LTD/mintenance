import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import type { VideoQueueItem } from './types';

/**
 * Queue persistence + result lookup extracted from VideoService.ts on
 * 2026-05-09. Pure AsyncStorage I/O with the server-status fallback
 * for `getProcessingResults`.
 */

const QUEUE_STORAGE_KEY = 'video_upload_queue';

export async function loadQueue(): Promise<VideoQueueItem[]> {
  try {
    const queueData = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (queueData) {
      return JSON.parse(queueData) as VideoQueueItem[];
    }
  } catch (error) {
    logger.error('Failed to load upload queue', { error });
  }
  return [];
}

export async function saveQueue(queue: VideoQueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    logger.error('Failed to save upload queue', { error });
  }
}

export async function storeProcessingResults(
  videoId: string,
  results: unknown
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `video_results_${videoId}`,
      JSON.stringify(results)
    );
    logger.info('Processing results stored', { videoId });
  } catch (error) {
    logger.error('Failed to store processing results', { error });
  }
}

/**
 * Get processing results for a queue-item id.
 *
 * Resolution order:
 *   1. AsyncStorage maps `video_assessment_${videoId} -> serverAssessmentId`
 *      (written by `uploadVideo`). Poll `/api/assessments/{id}/status`
 *      and return the AI assessment when complete.
 *   2. Legacy local-only storage at `video_results_${videoId}` for
 *      pre-server-side-AI captures.
 */
export async function getProcessingResults(videoId: string): Promise<unknown> {
  try {
    const serverAssessmentId = await AsyncStorage.getItem(
      `video_assessment_${videoId}`
    );

    if (serverAssessmentId) {
      const res = await mobileApiClient.get<{
        status: string;
        isComplete: boolean;
        isFailed: boolean;
        assessment: unknown;
      }>(`/api/assessments/${serverAssessmentId}/status`);

      if (res.isComplete && res.assessment) {
        return {
          aggregated_assessment: res.assessment,
          status: 'completed',
        };
      }
      if (res.isFailed) {
        return { status: 'failed', error: 'Assessment processing failed' };
      }
      return null;
    }

    const results = await AsyncStorage.getItem(`video_results_${videoId}`);
    return results ? JSON.parse(results) : null;
  } catch (error) {
    logger.error('Failed to get processing results', { error });
    return null;
  }
}
