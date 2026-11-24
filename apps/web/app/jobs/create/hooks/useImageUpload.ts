'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  preparePhotoUpload,
  photoUploadBatches,
} from '../utils/prepare-photo-upload';
import { clientErrorMessage } from '@/lib/errors/client-message';

interface ImagePreview {
  file: File;
  preview: string;
}

interface UseImageUploadOptions {
  maxImages?: number;
  onError?: (error: string) => void;
  csrfToken?: string;
}

interface UseImageUploadReturn {
  imagePreviews: ImagePreview[];
  uploadedImages: string[];
  isUploading: boolean;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addFiles: (files: File[]) => boolean;
  removeImage: (index: number) => void;
  uploadImages: (csrfToken?: string) => Promise<string[]>;
  clearImages: () => void;
}

/**
 * Hook for managing image uploads and previews
 * Handles image selection, preview generation, upload, and cleanup
 */
export function useImageUpload({
  maxImages = 10,
  onError,
}: UseImageUploadOptions = {}): UseImageUploadReturn {
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const previewsRef = useRef<ImagePreview[]>([]);
  const uploadPending = useRef(false);
  const selectionVersion = useRef(0);
  useEffect(
    () => () => {
      previewsRef.current.forEach(({ preview }) =>
        URL.revokeObjectURL(preview)
      );
    },
    []
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return false;
      // Validate file count
      if (previewsRef.current.length + files.length > maxImages) {
        const errorMessage = `Maximum ${maxImages} photos allowed`;
        if (onError) {
          onError(errorMessage);
        }
        return false;
      }

      // Create previews
      const newPreviews = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      selectionVersion.current += 1;
      previewsRef.current = [...previewsRef.current, ...newPreviews];
      setImagePreviews(previewsRef.current);
      setUploadedImages([]);
      return true;
    },
    [maxImages, onError]
  );
  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (addFiles(Array.from(e.target.files || []))) e.target.value = '';
    },
    [addFiles]
  );

  const removeImage = useCallback((index: number) => {
    const removed = previewsRef.current[index];
    if (removed) URL.revokeObjectURL(removed.preview);
    previewsRef.current = previewsRef.current.filter((_, i) => i !== index);
    selectionVersion.current += 1;
    setImagePreviews(previewsRef.current);
    setUploadedImages([]);
  }, []);

  const uploadImages = useCallback(
    async (_csrfToken?: string): Promise<string[]> => {
      if (imagePreviews.length === 0) return [];

      if (uploadPending.current)
        throw new Error('Photos are still uploading. Please wait.');
      uploadPending.current = true;
      const version = selectionVersion.current;
      setIsUploading(true);
      try {
        const headers = await getCsrfHeaders();

        const prepared: File[] = [];
        for (const { file } of imagePreviews)
          prepared.push(await preparePhotoUpload(file));
        const allUrls: string[] = [];
        for (const batch of photoUploadBatches(prepared)) {
          if (version !== selectionVersion.current)
            throw new Error(
              'The selected photos changed during upload. Please retry with your current selection.'
            );
          const formData = new FormData();
          batch.forEach((file) => formData.append('photos', file));

          const response = await fetch('/api/jobs/upload-photos', {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include', // CRITICAL: Include cookies (including CSRF cookie) in the request
          });

          if (response.status === 413)
            throw new Error(
              'This photo upload is too large. Please try a smaller photo; your details are still here.'
            );
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              clientErrorMessage(
                errorData,
                'Photos could not be uploaded. Please retry; your selected files are still here.'
              )
            );
          }

          const data = await response.json();
          const urls = Array.isArray(data.urls)
            ? data.urls.filter(
                (url: unknown) => typeof url === 'string' && url.length > 0
              )
            : [];
          if (version !== selectionVersion.current)
            throw new Error(
              'The selected photos changed during upload. Please retry with your current selection.'
            );
          if (urls.length !== batch.length)
            throw new Error(
              'Some photos did not upload. Your selection is preserved; retry or remove the affected photos.'
            );
          allUrls.push(...urls);
        }
        setUploadedImages(allUrls);

        return allUrls;
      } catch (error) {
        logger.error('Error uploading images', error, {
          service: 'image-upload',
        });
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to upload images. Please try again.';

        if (onError) {
          onError(errorMessage);
        }

        throw new Error(errorMessage);
      } finally {
        uploadPending.current = false;
        setIsUploading(false);
      }
    },
    [imagePreviews, onError]
  );

  const clearImages = useCallback(() => {
    imagePreviews.forEach(({ preview }) => {
      URL.revokeObjectURL(preview);
    });
    previewsRef.current = [];
    selectionVersion.current += 1;
    setImagePreviews([]);
    setUploadedImages([]);
  }, [imagePreviews]);

  return {
    imagePreviews,
    uploadedImages,
    isUploading,
    handleImageSelect,
    addFiles,
    removeImage,
    uploadImages,
    clearImages,
  };
}
