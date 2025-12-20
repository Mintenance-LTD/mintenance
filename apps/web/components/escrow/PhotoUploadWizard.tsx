'use client';

import React, { useState, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { logger } from '@mintenance/shared';

interface PhotoUploadWizardProps {
  jobId: string;
  photoType: 'before' | 'after' | 'video';
  onUploadComplete?: (urls: string[]) => void;
  onCancel?: () => void;
  required?: boolean;
  minPhotos?: number;
  requiredAngles?: string[];
}

interface UploadedPhoto {
  url: string;
  qualityScore: number;
  angleType?: string;
  file: File;
}

export function PhotoUploadWizard({
  jobId,
  photoType,
  onUploadComplete,
  onCancel,
  required = false,
  minPhotos = 3,
  requiredAngles = ['wide'],
}: PhotoUploadWizardProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [angleTypes, setAngleTypes] = useState<Record<number, string>>({});

  const captureGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      logger.warn('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        logger.error('Geolocation error:', error);
        setError('Failed to capture location. Please enable location services.');
      }
    );
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length < minPhotos) {
      setError(`At least ${minPhotos} photos are required`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Capture geolocation if not already captured
      if (!geolocation) {
        captureGeolocation();
      }

      const uploadedPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('photos', file);
        if (geolocation) {
          formData.append('geolocation', JSON.stringify(geolocation));
        }
        if (photoType === 'after' && angleTypes[i]) {
          formData.append('angleTypes', angleTypes[i]);
        }

        const endpoint = photoType === 'video'
          ? `/api/jobs/${jobId}/photos/video`
          : photoType === 'before'
          ? `/api/jobs/${jobId}/photos/before`
          : `/api/jobs/${jobId}/photos/after`;

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        if (photoType === 'video') {
          uploadedPhotos.push({
            url: data.url,
            qualityScore: 1,
            file,
          });
        } else {
          const photoData = data.photos?.[0] || data;
          uploadedPhotos.push({
            url: photoData.url,
            qualityScore: photoData.qualityScore || 0.7,
            angleType: photoData.angleType,
            file,
          });
        }
      }

      setPhotos(uploadedPhotos);
      setStep('review');
    } catch (error) {
      logger.error('Error uploading photos:', error);
      setError((error as Error).message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleAngleTypeChange = (index: number, angleType: string) => {
    setAngleTypes((prev) => ({ ...prev, [index]: angleType }));
  };

  const handleComplete = () => {
    if (onUploadComplete) {
      onUploadComplete(photos.map((p) => p.url));
    }
    setStep('complete');
  };

  const handleRetry = () => {
    setPhotos([]);
    setStep('upload');
    setError(null);
  };

  if (step === 'complete') {
    return (
      <Card style={{ padding: theme.spacing.lg }}>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.md }}>
            Photos Uploaded Successfully!
          </h3>
          <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.md }}>
            {photos.length} {photoType === 'video' ? 'video' : 'photo(s)'} uploaded
          </p>
          <Button onClick={() => { setStep('upload'); setPhotos([]); }}>
            Upload More
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'review') {
    return (
      <Card style={{ padding: theme.spacing.lg }}>
        <h3 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.md }}>
          Review Uploaded Photos
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
          {photos.map((photo, idx) => (
            <div key={idx}>
              <img src={photo.url} alt={`Photo ${idx + 1}`} style={{ width: '100%', borderRadius: theme.borderRadius.md }} />
              <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
                Quality: {(photo.qualityScore * 100).toFixed(0)}%
              </div>
              {photoType === 'after' && (
                <select
                  value={angleTypes[idx] || 'wide'}
                  onChange={(e) => handleAngleTypeChange(idx, e.target.value)}
                  style={{ width: '100%', marginTop: theme.spacing.xs, padding: theme.spacing.xs }}
                >
                  <option value="wide">Wide Angle</option>
                  <option value="close-up">Close-up</option>
                  <option value="overhead">Overhead</option>
                  <option value="side">Side View</option>
                </select>
              )}
            </div>
          ))}
        </div>

        {geolocation && (
          <div style={{ marginBottom: theme.spacing.md, fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Location captured: {geolocation.lat.toFixed(6)}, {geolocation.lng.toFixed(6)}
            {geolocation.accuracy && ` (accuracy: ${geolocation.accuracy.toFixed(0)}m)`}
          </div>
        )}

        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <Button onClick={handleComplete} disabled={photos.length < minPhotos}>
            Complete Upload
          </Button>
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {photos.length < minPhotos && (
          <p style={{ marginTop: theme.spacing.md, color: theme.colors.warning, fontSize: theme.typography.fontSize.sm }}>
            At least {minPhotos} photos are required. Please upload more.
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card style={{ padding: theme.spacing.lg }}>
      <h3 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.md }}>
        Upload {photoType === 'video' ? 'Video' : photoType === 'before' ? 'Before' : 'After'} Photos
      </h3>

      {required && (
        <p style={{ marginBottom: theme.spacing.md, color: theme.colors.textSecondary }}>
          {photoType === 'before' ? 'Before photos are required at job start.' : 'After photos are required at completion.'}
        </p>
      )}

      <div style={{ marginBottom: theme.spacing.md }}>
        <p style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }}>
          Requirements:
        </p>
        <ul style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, paddingLeft: theme.spacing.lg }}>
          <li>Minimum {minPhotos} photos</li>
          {requiredAngles.length > 0 && (
            <li>Required angles: {requiredAngles.join(', ')}</li>
          )}
          <li>Each photo must be less than 10MB</li>
          <li>Supported formats: JPEG, PNG, WebP</li>
        </ul>
      </div>

      {!geolocation && (
        <div style={{ marginBottom: theme.spacing.md }}>
          <Button variant="outline" onClick={captureGeolocation} size="sm">
            Capture Location
          </Button>
          <p style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
            Location helps verify photos are taken at the job site
          </p>
        </div>
      )}

      {geolocation && (
        <div style={{ marginBottom: theme.spacing.md, padding: theme.spacing.sm, backgroundColor: theme.colors.success + '20', borderRadius: theme.borderRadius.md }}>
          <div style={{ fontSize: theme.typography.fontSize.sm }}>
            ✓ Location captured: {geolocation.lat.toFixed(6)}, {geolocation.lng.toFixed(6)}
          </div>
        </div>
      )}

      <div style={{ marginBottom: theme.spacing.md }}>
        <input
          type="file"
          accept={photoType === 'video' ? 'video/*' : 'image/*'}
          multiple={photoType !== 'video'}
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ width: '100%', padding: theme.spacing.sm }}
        />
      </div>

      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <Spinner size="sm" />
          <span>Uploading...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: theme.spacing.md, backgroundColor: theme.colors.error + '20', borderRadius: theme.borderRadius.md, color: theme.colors.error, marginTop: theme.spacing.md }}>
          {error}
        </div>
      )}

      {onCancel && (
        <Button variant="ghost" onClick={onCancel} style={{ marginTop: theme.spacing.md }}>
          Cancel
        </Button>
      )}
    </Card>
  );
}

