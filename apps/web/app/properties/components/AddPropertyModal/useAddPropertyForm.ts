import React, { useState } from 'react';
import { logger } from '@mintenance/shared';
import type { AddPropertyFormData, LocationSuggestion, ImagePreview } from './types';

export function useAddPropertyForm(isOpen: boolean, onClose: () => void, onSuccess: () => void) {
  const [formData, setFormData] = useState<AddPropertyFormData>({
    property_name: '',
    address: '',
    property_type: 'residential',
    is_primary: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        property_name: '',
        address: '',
        property_type: 'residential',
        is_primary: false,
      });
      setError('');
      setLocationSuggestions([]);
      setShowSuggestions(false);
      setImagePreviews(prev => {
        prev.forEach(({ preview }) => URL.revokeObjectURL(preview));
        return [];
      });
      setUploadedImages([]);
    }
  }, [isOpen]);

  // Debounced address search for autocomplete
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.address.trim().length >= 3) {
        searchAddresses(formData.address);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.address]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `/api/geocoding/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to search addresses');
      }

      interface LocationSuggestionItem {
        display_name?: string;
        address?: string;
        name?: string;
        place_id?: string;
        osm_id?: string;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLocationSuggestions(data.map((item: LocationSuggestionItem) => ({
          display_name: item.display_name || item.address || item.name || 'Unknown location',
          place_id: item.place_id || item.osm_id || Math.random().toString(),
        })));
        setShowSuggestions(data.length > 0);
      }
    } catch (err) {
      logger.error('Error fetching address suggestions:', err);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setFormData(prev => ({ ...prev, address: suggestion.display_name }));
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (imagePreviews.length + files.length > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 5MB`);
        continue;
      }
      validFiles.push(file);
    }

    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imagePreviews.length === 0) return [];

    setIsUploadingImages(true);
    try {
      const uploadFormData = new FormData();
      imagePreviews.forEach(({ file }) => {
        uploadFormData.append('photos', file);
      });

      const response = await fetch('/api/properties/upload-photos', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to upload images';
        const errorDetails = errorData.details ? `\n\nDetails: ${errorData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      const data = await response.json();
      setUploadedImages(data.urls || []);
      return data.urls || [];
    } catch (error) {
      logger.error('Error uploading images:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload images. Please try again.';
      alert(errorMessage);
      return [];
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.property_name.trim()) {
      setError('Property name is required');
      return;
    }

    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrls: string[] = [];
      if (imagePreviews.length > 0) {
        photoUrls = await uploadImages();
        if (photoUrls.length === 0 && imagePreviews.length > 0) {
          const shouldContinue = window.confirm(
            'Failed to upload some photos. Do you want to continue without photos?'
          );
          if (!shouldContinue) {
            setIsSubmitting(false);
            return;
          }
        }
      }

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          photos: photoUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create property');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    isSubmitting,
    error,
    locationSuggestions,
    showSuggestions,
    setShowSuggestions,
    isLoadingSuggestions,
    imagePreviews,
    isUploadingImages,
    handleSelectSuggestion,
    handleImageSelect,
    removeImage,
    handleSubmit,
  };
}
