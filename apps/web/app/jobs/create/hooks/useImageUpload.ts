'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@mintenance/shared';

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

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(({ preview }) => {
        URL.revokeObjectURL(preview);
      });
    };
  }, [imagePreviews]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (imagePreviews.length + files.length > maxImages) {
      const errorMessage = `Maximum ${maxImages} photos allowed`;
      if (onError) {
        onError(errorMessage);
      }
      return;
    }

    // Create previews
    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [imagePreviews.length, maxImages, onError]);

  const removeImage = useCallback((index: number) => {
    setImagePreviews(prev => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadImages = useCallback(async (csrfToken?: string): Promise<string[]> => {
    if (imagePreviews.length === 0) return [];

    setIsUploading(true);
    try {
      // CRITICAL FIX: Fetch a fresh CSRF token right before upload to ensure cookie and header match
      // The token from state might be stale if the cookie was updated by another request
      let tokenToUse = csrfToken;
      try {
        const tokenResponse = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include', // Important: include cookies
        });
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          tokenToUse = tokenData.token;
          
          // Small delay to ensure cookie is processed by browser before next request
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          // Fallback to provided token if fetch fails
          logger.warn('[Upload] Failed to fetch fresh CSRF token, using provided token', [object Object], { service: 'app' });
        }
      } catch (tokenError) {
        // Fallback to provided token if fetch fails
        logger.warn('[Upload] Error fetching fresh CSRF token, using provided token:', tokenError', [object Object], { service: 'app' });
      }

      if (!tokenToUse) {
        throw new Error('CSRF token is required for image upload');
      }

      const formData = new FormData();
      imagePreviews.forEach(({ file }) => {
        formData.append('photos', file);
      });

      // Create headers - use the fresh token
      const headers: Record<string, string> = {
        'x-csrf-token': tokenToUse,
      };
      logger.info('[Upload] CSRF token present:', tokenToUse.substring(0, 10', [object Object], { service: 'app' }) + '...');
      logger.info('[Upload] Uploading', imagePreviews.length, 'photos with headers:', Object.keys(headers', [object Object], { service: 'app' }));

      const response = await fetch('/api/jobs/upload-photos', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include', // CRITICAL: Include cookies (including CSRF cookie) in the request
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to upload images';
        const errorDetails = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      const data = await response.json();
      const urls = data.urls || [];
      setUploadedImages(urls);

      // Warn user if some files failed to upload
      if (data.warning && onError) {
        onError(data.warning);
      }

      return urls;
    } catch (error) {
      logger.error('Error uploading images', error, {
        service: 'image-upload',
      });
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload images. Please try again.';
      
      if (onError) {
        onError(errorMessage);
      }
      
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [imagePreviews, onError]);

  const clearImages = useCallback(() => {
    imagePreviews.forEach(({ preview }) => {
      URL.revokeObjectURL(preview);
    });
    setImagePreviews([]);
    setUploadedImages([]);
  }, [imagePreviews]);

  return {
    imagePreviews,
    uploadedImages,
    isUploading,
    handleImageSelect,
    removeImage,
    uploadImages,
    clearImages,
  };
}

