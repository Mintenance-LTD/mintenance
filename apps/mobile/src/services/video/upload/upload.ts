import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@mintenance/shared';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { readVideoFile } from './file-utils';
import type { VideoUploadProgress } from './types';

/**
 * Upload pipeline extracted from VideoService.ts on 2026-05-09.
 * Owns the multipart POST + the AsyncStorage key writes used by the
 * polling path in `getProcessingResults`.
 *
 * 2026-04-30 audit P0-3: callers MUST pass either a real assessmentId
 * (uuid created via POST /api/assessments first) OR a propertyId, not
 * the placeholder `'unknown'`. The server uses one or the other to
 * attach the video to a real row instead of spawning an orphan
 * assessment.
 */

export interface UploadVideoOptions {
  assessmentId?: string;
  propertyId?: string;
  /**
   * 2026-04-30 audit P1 follow-up: the queue processor passes its own
   * local id so we can write a polling-key mapping
   * `video_assessment_${queueItemId} -> serverAssessmentId` for the
   * `getProcessingResults` lookup. Without this the poller looked up
   * by queue-item id but we only stored under the server-issued id.
   */
  queueItemId?: string;
}

export interface UploadVideoResult {
  url: string;
  path: string;
  assessmentId: string;
}

export async function uploadVideo(
  videoPath: string,
  options: UploadVideoOptions,
  _onProgress?: (progress: VideoUploadProgress) => void
): Promise<UploadVideoResult> {
  const { assessmentId, propertyId, queueItemId } = options;
  if (!assessmentId && !propertyId) {
    throw new Error(
      'uploadVideo requires assessmentId or propertyId — refusing to upload an orphan video'
    );
  }

  try {
    const videoData = await readVideoFile(videoPath);

    const idForFileName = assessmentId ?? propertyId ?? 'video';
    const fileName = `${idForFileName}_${Date.now()}.mp4`;
    const storagePath = assessmentId
      ? `assessments/${assessmentId}/videos/${fileName}`
      : `assessments/unlinked/${propertyId}/${fileName}`;

    logger.info('Uploading video via API', {
      storagePath,
      size: videoData.size,
      hasAssessmentId: !!assessmentId,
    });

    const formData = new FormData();
    formData.append('video', videoData, fileName);
    if (assessmentId) {
      formData.append('assessmentId', assessmentId);
    }
    if (propertyId) {
      formData.append('propertyId', propertyId);
    }

    const uploadResult = await mobileApiClient.postFormData<{
      success: boolean;
      assessmentId: string;
      videoUrl: string;
      status: string;
    }>(`/api/assessments/videos/upload`, formData);

    logger.info('Video uploaded successfully', {
      url: uploadResult.videoUrl,
      assessmentId: uploadResult.assessmentId,
    });

    // Persist the SERVER-issued assessmentId for status polling. Write
    // under both keys (queueItemId + serverId) so a future call from
    // either side resolves; the server-id key is mostly defensive for
    // replay/inspection.
    if (queueItemId) {
      await AsyncStorage.setItem(
        `video_assessment_${queueItemId}`,
        uploadResult.assessmentId
      );
    }
    await AsyncStorage.setItem(
      `video_assessment_${uploadResult.assessmentId}`,
      uploadResult.assessmentId
    );

    return {
      url: uploadResult.videoUrl,
      path: storagePath,
      assessmentId: uploadResult.assessmentId,
    };
  } catch (error) {
    logger.error('Video upload failed', { error });
    throw error;
  }
}
