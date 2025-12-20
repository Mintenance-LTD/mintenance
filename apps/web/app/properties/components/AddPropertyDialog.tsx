'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/Icon';
import { AlertCircle, Loader2 } from 'lucide-react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const propertyFormSchema = z.object({
  property_name: z.string().min(2, 'Property name must be at least 2 characters'),
  address: z.string().min(5, 'Address is required'),
  property_type: z.enum(['residential', 'commercial', 'rental']),
  is_primary: z.boolean().optional().default(false),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

export function AddPropertyDialog({ open, onOpenChange, onSuccess }: AddPropertyDialogProps) {
  const [locationSuggestions, setLocationSuggestions] = React.useState<Array<{ display_name: string; place_id: string }>>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [imagePreviews, setImagePreviews] = React.useState<Array<{ file: File; preview: string; category?: string }>>([]);
  const [uploadedImages, setUploadedImages] = React.useState<Array<{ url: string; category: string }>>([]);
  const [isUploadingImages, setIsUploadingImages] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  // Property photo categories for AI training
  const photoCategories = [
    { value: 'exterior', label: 'Exterior' },
    { value: 'roof', label: 'Roof' },
    { value: 'wall', label: 'Wall' },
    { value: 'windows', label: 'Windows' },
    { value: 'doors', label: 'Doors' },
    { value: 'foundation', label: 'Foundation' },
    { value: 'interior', label: 'Interior' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'flooring', label: 'Flooring' },
    { value: 'other', label: 'Other' },
  ];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema) as any,
    defaultValues: {
      property_name: '',
      address: '',
      property_type: 'residential',
      is_primary: false,
    },
  });

  const addressValue = watch('address');
  const propertyType = watch('property_type');
  const isPrimary = watch('is_primary');

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      reset();
      setSubmitError('');
      setLocationSuggestions([]);
      setShowSuggestions(false);
      setImagePreviews(prev => {
        prev.forEach(({ preview }) => URL.revokeObjectURL(preview));
        return [];
      });
      setUploadedImages([]);
    }
  }, [open, reset]);

  // Debounced address search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (addressValue && addressValue.trim().length >= 3) {
        searchAddresses(addressValue);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [addressValue]);

  const searchAddresses = async (query: string) => {
    if (query.length < 3) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query)}`);

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

  const handleSelectSuggestion = (suggestion: { display_name: string; place_id: string }) => {
    setValue('address', suggestion.display_name);
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
      category: 'other', // Default category
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

  const updateImageCategory = (index: number, category: string) => {
    setImagePreviews(prev => prev.map((item, i) => 
      i === index ? { ...item, category } : item
    ));
  };

  const uploadImages = async (): Promise<Array<{ url: string; category: string }>> => {
    if (imagePreviews.length === 0) return [];

    setIsUploadingImages(true);
    try {
      const formData = new FormData();
      imagePreviews.forEach(({ file, category = 'other' }) => {
        formData.append('photos', file);
        formData.append('categories', category);
      });

      const response = await fetch('/api/properties/upload-photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload images');
      }

      const data = await response.json();
      // Use photos array if available (new format), otherwise fall back to urls
      const categorizedPhotos = data.photos || (data.urls || []).map((url: string, index: number) => ({
        url,
        category: imagePreviews[index]?.category || 'other',
      }));
      setUploadedImages(categorizedPhotos);
      return categorizedPhotos;
    } catch (error) {
      logger.error('Error uploading images:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload images. Please try again.';
      alert(errorMessage);
      return [];
    } finally {
      setIsUploadingImages(false);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    setSubmitError('');

    try {
      let categorizedPhotos: Array<{ url: string; category: string }> = [];
      if (imagePreviews.length > 0) {
        categorizedPhotos = await uploadImages();
        if (categorizedPhotos.length === 0 && imagePreviews.length > 0) {
          const shouldContinue = window.confirm(
            'Failed to upload some photos. Do you want to continue without photos?'
          );
          if (!shouldContinue) {
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
          ...data,
          photos: categorizedPhotos, // Send categorized photos
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Log detailed error for debugging
        logger.error('Property creation failed:', {
          status: response.status,
          error: responseData.error,
          details: responseData.details,
          data: data,
        });
        
        // Show more detailed error message
        let errorMessage = responseData.error || 'Failed to create property';
        if (responseData.details) {
          errorMessage += `: ${responseData.details}`;
        }
        throw new Error(errorMessage);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Error in onSubmit:', error);
      setSubmitError(error.message || 'Failed to create property. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
          <DialogDescription>
            Add a new property to track maintenance and jobs
          </DialogDescription>
        </DialogHeader>

        {/* Error Message */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 mt-4">
          {/* Property Name */}
          <div className="space-y-2">
            <Label htmlFor="property_name">Property Name *</Label>
            <Input
              id="property_name"
              {...register('property_name')}
              placeholder="e.g., My Home, Rental Property, Office Building"
            />
            {errors.property_name && (
              <p className="text-sm text-red-600 mt-1">{errors.property_name.message}</p>
            )}
          </div>

          {/* Address with Autocomplete */}
          <div className="space-y-2 relative">
            <Label htmlFor="address">Address *</Label>
            <div className="relative">
              <Input
                id="address"
                {...register('address')}
                placeholder="Enter property address"
                onFocus={() => {
                  if (locationSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
              />
              {errors.address && (
                <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
              )}
              {isLoadingSuggestions && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Address Suggestions */}
            {showSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                {locationSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    {suggestion.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label htmlFor="property_type">Property Type *</Label>
            <Select value={propertyType} onValueChange={(value: PropertyFormData['property_type']) => setValue('property_type', value)}>
              <SelectTrigger id="property_type">
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
              </SelectContent>
            </Select>
            {errors.property_type && (
              <p className="text-sm text-red-600">{errors.property_type.message}</p>
            )}
          </div>

          {/* Property Photos */}
          <div className="space-y-2">
            <Label htmlFor="property_photos">
              Property Photos {imagePreviews.length > 0 && `(${imagePreviews.length}/10)`}
            </Label>
            <input
              type="file"
              id="property_photos"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              disabled={isUploadingImages || isSubmitting}
              className="hidden"
            />
            <div className="space-y-3">
              <label
                htmlFor="property_photos"
                className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md bg-gray-50 cursor-pointer transition-all ${
                  isUploadingImages || isSubmitting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-primary hover:bg-gray-100'
                }`}
              >
                <Icon name="image" size={20} color={theme.colors.primary} />
                <span className="text-sm font-medium text-gray-700">
                  {isUploadingImages ? 'Uploading...' : 'Click to add photos (max 10)'}
                </span>
              </label>

              {/* Image Previews with Categories */}
              {imagePreviews.length > 0 && (
                <div className="space-y-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 border border-gray-200 rounded-md bg-gray-50"
                    >
                      <div className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                        <img
                          src={preview.preview}
                          alt={`Property photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          disabled={isUploadingImages || isSubmitting}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`photo-category-${index}`} className="text-xs font-medium text-gray-700 mb-1 block">
                          Category *
                        </Label>
                        <Select
                          value={preview.category || 'other'}
                          onValueChange={(value) => updateImageCategory(index, value)}
                          disabled={isUploadingImages || isSubmitting}
                        >
                          <SelectTrigger id={`photo-category-${index}`} className="h-8 text-sm">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {photoCategories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Categorize to help AI training
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Primary Property Checkbox */}
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
            <Checkbox
              id="is_primary"
              checked={isPrimary}
              onCheckedChange={(checked) => setValue('is_primary', checked === true)}
            />
            <Label htmlFor="is_primary" className="font-normal cursor-pointer">
              Set as primary property
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isUploadingImages}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Property'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

