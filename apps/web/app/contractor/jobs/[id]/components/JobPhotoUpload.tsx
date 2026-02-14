'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import { Upload, MapPin, X, Camera, CheckCircle, PlayCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface JobPhotoUploadProps {
  jobId: string;
  jobStatus: string;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
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
  latitude,
  longitude,
  location,
  onJobStarted,
  onJobCompleted,
}: JobPhotoUploadProps) {
  const router = useRouter();
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBeforeMode = jobStatus === 'assigned';
  const isAfterMode = jobStatus === 'in_progress';
  const isCompleted = jobStatus === 'completed';

  const mode = isBeforeMode ? 'before' : 'after';
  const title = isBeforeMode
    ? 'Upload Before Photos'
    : isAfterMode
      ? 'Upload After Photos'
      : 'Photos Submitted';
  const subtitle = isBeforeMode
    ? 'Take photos of the current damage before starting work'
    : isAfterMode
      ? 'Take photos of the completed work to finish the job'
      : 'Before and after photos have been uploaded';

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setPendingFiles(prev => [...prev, ...newFiles]);

    const newUrls = newFiles.map(f => URL.createObjectURL(f));
    setPreviewUrls(prev => [...prev, ...newUrls]);
    setError(null);
  }, []);

  const removePending = useCallback((index: number) => {
    const url = previewUrls[index];
    if (url) URL.revokeObjectURL(url);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }, [previewUrls]);

  const getGeolocation = (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);
    setError(null);

    try {
      const geo = await getGeolocation();
      const formData = new FormData();
      pendingFiles.forEach(f => formData.append('photos', f));
      if (geo) formData.append('geolocation', JSON.stringify(geo));

      const res = await fetchWithCsrf(`/api/jobs/${jobId}/photos/${mode}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Clear previews and add uploaded photos
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPendingFiles([]);
      setPreviewUrls([]);

      const newPhotos: UploadedPhoto[] = (data.photos || []).map((p: { url: string; qualityScore: number }) => ({
        url: p.url,
        qualityScore: p.qualityScore,
      }));
      setUploadedPhotos(prev => [...prev, ...newPhotos]);

      if (isAfterMode && data.jobCompleted) {
        setSuccessMessage('Job completed! The homeowner has been notified to review your work.');
        onJobCompleted?.();
        router.refresh();
      } else {
        setSuccessMessage(`${data.count} photo${data.count > 1 ? 's' : ''} uploaded successfully`);
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start job');

      setSuccessMessage('Job started! You can now begin work.');
      onJobStarted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start job');
    } finally {
      setIsStarting(false);
    }
  };

  const canStartJob = isBeforeMode && uploadedPhotos.length > 0;

  const mapUrl = latitude && longitude
    ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}&zoom=15`
    : location
      ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(location)}&zoom=15`
      : null;

  return (
    <StandardCard>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Camera className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        {/* Completed state */}
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700">Photos have been submitted for review</span>
          </div>
        )}

        {/* Upload area (before/after modes only) */}
        {!isCompleted && (
          <>
            <label htmlFor="photo-upload-input" className="block cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
                id="photo-upload-input"
              />
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Tap to take a photo or select from gallery
              </p>
            </label>

            {/* Pending files preview */}
            {previewUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Ready to upload ({previewUrls.length})
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Preview ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => removePending(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full mt-3"
                  size="md"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : `Upload ${previewUrls.length} Photo${previewUrls.length > 1 ? 's' : ''}`}
                </Button>
              </div>
            )}

            {/* Uploaded photos */}
            {uploadedPhotos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Uploaded ({uploadedPhotos.length})
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {uploadedPhotos.map((photo, i) => (
                    <div key={i} className="relative">
                      <img src={photo.url} alt={`Uploaded ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
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
                disabled={!canStartJob || isStarting}
                variant="primary"
                className="w-full"
                size="lg"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                {isStarting ? 'Starting Job...' : 'Start Job'}
              </Button>
            )}
          </>
        )}

        {/* Status messages */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}
        {successMessage && (
          <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{successMessage}</div>
        )}

        {/* Google Maps */}
        {mapUrl && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Job Location</span>
            </div>
            <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-200">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={mapUrl}
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </StandardCard>
  );
}
