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
}

interface UseImageUploadReturn {
  imagePreviews: ImagePreview[];
  uploadedImages: string[];
  isUploading: boolean;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  uploadImages: () => Promise<string[]>;
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

  const uploadImages = useCallback(async (): Promise<string[]> => {
    if (imagePreviews.length === 0) return [];

    setIsUploading(true);
    try {
      const formData = new FormData();
      imagePreviews.forEach(({ file }) => {
        formData.append('photos', file);
      });

      const response = await fetch('/api/jobs/upload-photos', {
        method: 'POST',
        body: formData,
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

