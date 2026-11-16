'use client';
import { useJobRework } from '@/lib/hooks/useJobRework';
import { ReworkHistory } from '@/components/jobs/ReworkHistory';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import { Upload, X, Camera, CheckCircle, PlayCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { readActionResponse } from '@/lib/api/read-action-response';
import { photoBatchError } from '@/lib/photos/upload-limits';

interface JobPhotoUploadProps {
  jobId: string;
  jobStatus: string;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  /**
   * Count of before-photos already persisted server-side. The "Start Job"
   * button enables when this is > 0 OR the contractor uploads at least
   * one photo in this session, so a return visit after a previous upload
   * still works. 2026-05-25 audit-P0-3.
   */
  existingBeforePhotosCount?: number;
  onJobStarted?: () => void;
  onJobCompleted?: () => void;
}

interface UploadedPhoto {
  url: string;
  qualityScore: number;
  file?: File;
}

/**
 * JobPhotoUpload - Photo upload with mode-based UI for job lifecycle
 *
 * Modes:
 * - assigned: Upload before photos + "Start Job" button
 * - in_progress: Upload after photos (auto-completes job)
 * - completed: Read-only confirmation
 */
export function JobPhotoUpload({
  jobId,
  jobStatus,
  existingBeforePhotosCount = 0,
  onJobStarted,
  onJobCompleted,
}: JobPhotoUploadProps) {
  const router = useRouter();
  const rework = useJobRework(jobId, jobStatus);
  const [isSubmittingRework, setIsSubmittingRework] = useState(false);
  // Server-rendered inputs must not accept files before onChange is attached.
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingAngles, setPendingAngles] = useState<
    Array<'wide' | 'close-up'>
  >([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [missingEvidence, setMissingEvidence] = useState<string[]>([]);

  const isBeforeMode = jobStatus === 'assigned';
  const isAfterMode = jobStatus === 'in_progress';
  const isCompleted = jobStatus === 'completed';

  const mode = isBeforeMode ? 'before' : 'after';
  useEffect(() => {
    setUploadedPhotos([]);
    setPendingFiles([]);
    setPendingAngles([]);
    setPreviewUrls((previous) => {
      previous.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    setSuccessMessage(null);
    setMissingEvidence([]);
  }, [jobId, mode, rework.latest?.id]);
  const title = isBeforeMode
    ? 'Upload Before Photos'
    : isAfterMode
      ? rework.latest
        ? 'Upload fresh rework evidence'
        : 'Upload After Photos'
      : 'Photos Submitted';
  const subtitle = isBeforeMode
    ? 'Take photos of the current damage before starting work'
    : isAfterMode
      ? 'At least 3 accepted after photos are required, including a wide view. Plumbing, electrical and painting jobs also require a close-up. Select the view for each photo. Only photos accepted in the current completion cycle count towards the total.'
      : 'Before and after photos have been uploaded';

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newFiles = Array.from(files);
      e.target.value = '';
      const selectionError = photoBatchError([...pendingFiles, ...newFiles]);
      if (selectionError) {
        setError(selectionError);
        return;
      }
      setPendingFiles((prev) => [...prev, ...newFiles]);
      setPendingAngles((prev) => [
        ...prev,
        ...newFiles.map(() => 'wide' as const),
      ]);

      const newUrls = newFiles.map((f) => URL.createObjectURL(f));
      setPreviewUrls((prev) => [...prev, ...newUrls]);
      setError(null);
    },
    [pendingFiles]
  );

  const removePending = useCallback(
    (index: number) => {
      const url = previewUrls[index];
      if (url) URL.revokeObjectURL(url);
      setPendingFiles((prev) => prev.filter((_, i) => i !== index));
      setPendingAngles((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    },
    [previewUrls]
  );

  const getGeolocation = (): Promise<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    const selectionError = photoBatchError(pendingFiles);
    if (selectionError) {
      setError(selectionError);
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      const geo = await getGeolocation();
      let uploadedCount = 0;
      let completed = false;
      // Keep successful uploads out of a retry; each request stays below the host body limit.
      for (let index = 0; index < pendingFiles.length; index++) {
        const formData = new FormData();
        formData.append('photos', pendingFiles[index]);
        if (isAfterMode) formData.append('angleTypes', pendingAngles[index]);
        if (geo) formData.append('geolocation', JSON.stringify(geo));
        const res = await fetchWithCsrf(
          '/api/jobs/' + jobId + '/photos/' + mode,
          { method: 'POST', body: formData }
        );
        const data = await readActionResponse<{
          validation?: { passed: boolean; errors: unknown[] };
          photos?: Array<{ url: string; qualityScore: number }>;
          count: number;
          jobCompleted?: boolean;
        }>(
          res,
          'Unable to upload ' + pendingFiles[index].name + '. Please retry.'
        );
        uploadedCount += data.count;
        completed ||= data.jobCompleted === true;
        setUploadedPhotos((previous) => [...previous, ...(data.photos ?? [])]);
        URL.revokeObjectURL(previewUrls[index]);
        setPendingFiles(pendingFiles.slice(index + 1));
        setPendingAngles(pendingAngles.slice(index + 1));
        setPreviewUrls(previewUrls.slice(index + 1));
        setMissingEvidence(
          isAfterMode && data.validation?.passed === false
            ? data.validation.errors.filter(
                (message): message is string => typeof message === 'string'
              )
            : []
        );
        setSuccessMessage(uploadedCount + ' photo(s) uploaded successfully.');
      }
      if (isAfterMode && completed) {
        setSuccessMessage(
          'Job completed! The homeowner has been notified to review your work.'
        );
        onJobCompleted?.();
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartJob = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/jobs/${jobId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      await readActionResponse(res, 'Failed to start job. Please retry.');

      setSuccessMessage('Job started! You can now begin work.');
      onJobStarted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start job');
    } finally {
      setIsStarting(false);
    }
  };

  const submitRework = async () => {
    if (!rework.latest || rework.loading || rework.error) return;
    setIsSubmittingRework(true);
    setError(null);
    try {
      const response = await fetchWithCsrf('/api/jobs/' + jobId + '/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reworkRequestId: rework.latest.id }),
      });
      const result = await readActionResponse<{ success?: boolean }>(
        response,
        'Unable to submit rework. Check the fresh evidence requirements.'
      );
      if (result.success !== true)
        throw new Error('Rework was not submitted. Please retry.');
      setSuccessMessage(
        'Rework submitted for homeowner review. Payment remains held pending review and release checks.'
      );
      onJobCompleted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit rework.');
    } finally {
      setIsSubmittingRework(false);
    }
  };

  // Enable Start Job when there are photos uploaded in this session OR
  // photos already exist server-side from a previous visit. Both paths
  // satisfy the API gate at POST /api/jobs/:id/start (which counts
  // job_photos_metadata directly).
  const canStartJob =
    isBeforeMode &&
    (uploadedPhotos.length > 0 || existingBeforePhotosCount > 0);

  return (
    <StandardCard>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-center gap-3'>
          <Camera className='h-5 w-5 text-blue-600' />
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>{title}</h3>
            <p className='text-sm text-gray-500'>{subtitle}</p>
            {!isCompleted && (
              <p className='text-sm text-gray-500'>
                Choose up to 10 photos, at most 4 MB each. Files upload
                individually. Use clear, well-lit photos of at least 800 × 600
                pixels.
              </p>
            )}
          </div>
        </div>

        {rework.error && <p role='alert'>{rework.error}</p>}
        <ReworkHistory requests={rework.requests} />
        {isAfterMode && rework.latest && (
          <div className='space-y-2'>
            <p>
              Upload at least three new accepted photos covering the requested
              changes, including the required views. Uploading does not submit
              rework.
            </p>
            <Button
              onClick={submitRework}
              disabled={
                isUploading ||
                isSubmittingRework ||
                rework.loading ||
                !!rework.error
              }
            >
              {isSubmittingRework
                ? 'Submitting rework…'
                : 'Submit rework for review'}
            </Button>
          </div>
        )}
        {/* Completed state */}
        {isCompleted && (
          <div className='flex items-center gap-2 p-3 bg-green-50 rounded-lg'>
            <CheckCircle className='h-5 w-5 text-green-600' />
            <span className='text-sm text-green-700'>
              Photos have been submitted for review
            </span>
          </div>
        )}

        {/* Upload area (before/after modes only) */}
        {!isCompleted && (
          <>
            <label
              htmlFor='photo-upload-input'
              className='block cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors'
            >
              <input
                type='file'
                multiple
                accept='image/*'
                capture='environment'
                onChange={handleFileSelect}
                className='hidden'
                disabled={
                  !isReady ||
                  isUploading ||
                  isSubmittingRework ||
                  rework.loading ||
                  !!rework.error
                }
                id='photo-upload-input'
              />
              <Upload className='h-8 w-8 mx-auto text-gray-400 mb-2' />
              <p className='text-sm text-gray-600'>
                Tap to take a photo or select from gallery
              </p>
            </label>

            {/* Pending files preview */}
            {previewUrls.length > 0 && (
              <div>
                <p className='text-sm font-medium text-gray-700 mb-2'>
                  Ready to upload ({previewUrls.length})
                </p>
                {isAfterMode && (
                  <p className='text-sm text-gray-600 mb-2'>
                    Select the view shown in each photo. Include wide views of
                    the work and close-ups of the finished details.
                  </p>
                )}
                <div className='grid grid-cols-3 gap-3'>
                  {previewUrls.map((url, i) => (
                    <div key={url}>
                      <div className='relative group h-24'>
                        <Image
                          src={url}
                          alt={`Preview ${i + 1}`}
                          fill
                          className='object-cover rounded-lg'
                        />
                        <button
                          onClick={() => removePending(i)}
                          aria-label={`Remove photo ${i + 1}`}
                          disabled={isUploading || isSubmittingRework}
                          className='absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity'
                        >
                          <X className='h-3 w-3' />
                        </button>
                      </div>
                      {isAfterMode && (
                        <label className='block mt-2 text-sm text-gray-700'>
                          Photo {i + 1} angle
                          <select
                            aria-label={`Photo ${i + 1} angle`}
                            value={pendingAngles[i]}
                            disabled={isUploading || isSubmittingRework}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === 'wide' || value === 'close-up') {
                                setPendingAngles((angles) =>
                                  angles.map((angle, index) =>
                                    index === i ? value : angle
                                  )
                                );
                              }
                            }}
                            className='mt-1 block w-full rounded border border-gray-300 p-2'
                          >
                            <option value='wide'>Wide view</option>
                            <option value='close-up'>Close-up</option>
                          </select>
                        </label>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || isSubmittingRework}
                  className='w-full mt-3'
                  size='md'
                >
                  <Upload className='h-4 w-4 mr-2' />
                  {isUploading
                    ? 'Uploading...'
                    : `Upload ${previewUrls.length} Photo${previewUrls.length > 1 ? 's' : ''}`}
                </Button>
              </div>
            )}

            {/* Uploaded photos */}
            {uploadedPhotos.length > 0 && (
              <div>
                <p className='text-sm font-medium text-gray-700 mb-2'>
                  Uploaded ({uploadedPhotos.length})
                </p>
                <div className='grid grid-cols-3 gap-3'>
                  {uploadedPhotos.map((photo, i) => (
                    <div key={i} className='relative h-24'>
                      <Image
                        src={photo.url}
                        alt={`Uploaded ${i + 1}`}
                        fill
                        className='object-cover rounded-lg'
                      />
                      <div className='absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded'>
                        {Math.round(photo.qualityScore * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start Job button (before mode only) */}
            {isBeforeMode && (
              <Button
                onClick={handleStartJob}
                disabled={!isReady || !canStartJob || isStarting}
                variant='primary'
                className='w-full'
                size='lg'
              >
                <PlayCircle className='h-5 w-5 mr-2' />
                {isStarting ? 'Starting Job...' : 'Start Job'}
              </Button>
            )}
          </>
        )}

        {/* Status messages */}
        {error && (
          <div
            role='alert'
            className='p-3 bg-red-50 text-red-700 text-sm rounded-lg'
          >
            {error}
          </div>
        )}
        {missingEvidence.length > 0 && (
          <div
            role='status'
            className='p-3 bg-amber-50 text-amber-900 text-sm rounded-lg'
          >
            <p>
              Photos saved. More evidence is needed before this job can be
              completed:
            </p>
            <ul className='list-disc pl-5'>
              {missingEvidence.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        {successMessage && (
          <div
            role='status'
            className='p-3 bg-green-50 text-green-700 text-sm rounded-lg'
          >
            {successMessage}
          </div>
        )}
      </div>
    </StandardCard>
  );
}
