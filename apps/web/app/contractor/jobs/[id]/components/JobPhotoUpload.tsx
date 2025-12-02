'use client';

import React, { useState } from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { Button } from '@/components/ui/Button';
import { Upload, MapPin, X } from 'lucide-react';
import { IconContainer } from '@/components/ui/IconContainer';

interface JobPhotoUploadProps {
  jobId: string;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
}

/**
 * JobPhotoUpload - Photo upload component with embedded Google Maps
 */
export function JobPhotoUpload({ jobId, latitude, longitude, location }: JobPhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    // TODO: Implement actual file upload to storage
    // For now, just create preview URLs
    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newPhotos.push(url);
    }
    setPhotos([...photos, ...newPhotos]);
    setIsUploading(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const mapUrl = latitude && longitude
    ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}&zoom=15`
    : location
      ? `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(location)}&zoom=15`
      : null;

  return (
    <StandardCard>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Job Photos</h3>
          <label htmlFor="photo-upload-input" className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
              id="photo-upload-input"
            />
            <Button type="button" size="sm" disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Photos'}
            </Button>
          </label>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo}
                  alt={`Job photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Google Maps Embed */}
        {mapUrl && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Job Location</span>
            </div>
            <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200">
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

