'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Upload, X, Loader2, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';

const ROOM_TYPES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'dining_room', label: 'Dining Room' },
  { value: 'garage', label: 'Garage' },
  { value: 'garden', label: 'Garden' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'roof', label: 'Roof' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'office', label: 'Office' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
] as const;

interface RoomPhoto {
  id: string;
  room_type: string;
  photo_url: string;
  file_name: string;
  created_at: string;
}

interface RoomPhotoGalleryProps {
  propertyId: string;
}

export default function RoomPhotoGallery({ propertyId }: RoomPhotoGalleryProps) {
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [grouped, setGrouped] = useState<Record<string, RoomPhoto[]>>({});
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/room-photos`);
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data.photos || []);
      setGrouped(data.grouped || {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleUpload = async (files: FileList) => {
    if (!selectedRoom || !files.length) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('room_type', selectedRoom);
      Array.from(files).forEach(f => formData.append('photos', f));

      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/properties/${propertyId}/room-photos`, {
        method: 'POST',
        headers: { ...csrfHeaders },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        return;
      }

      toast.success(`${data.uploaded} photo${data.uploaded > 1 ? 's' : ''} uploaded`);
      if (data.warnings?.length) {
        toast.error(`${data.warnings.length} file(s) failed`);
      }
      fetchPhotos();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photoId: string) => {
    setDeleting(photoId);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(
        `/api/properties/${propertyId}/room-photos?photoId=${photoId}`,
        { method: 'DELETE', headers: { ...csrfHeaders } }
      );
      if (!res.ok) {
        toast.error('Failed to delete photo');
        return;
      }
      toast.success('Photo deleted');
      fetchPhotos();
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setDeleting(null);
    }
  };

  const roomPhotos = selectedRoom ? (grouped[selectedRoom] || []) : [];
  const totalPhotos = photos.length;

  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl h-full">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-4 h-4 text-teal-600" />
        <h4 className="text-sm font-semibold text-gray-900">Room Photos</h4>
        <span className="text-xs text-gray-400 ml-auto">{totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}</span>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Upload photos organized by room for documentation and maintenance tracking.
      </p>

      {/* Room selector pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ROOM_TYPES.map(room => {
          const count = grouped[room.value]?.length || 0;
          const isActive = selectedRoom === room.value;
          return (
            <button
              key={room.value}
              onClick={() => setSelectedRoom(isActive ? null : room.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : count > 0
                    ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {room.label}{count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>

      {/* Upload area */}
      {selectedRoom && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload photos to {ROOM_TYPES.find(r => r.value === selectedRoom)?.label}</>
            )}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* Photo grid */}
      {!loading && selectedRoom && roomPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {roomPhotos.map(photo => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={photo.photo_url}
                alt={photo.file_name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 120px"
              />
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deleting === photo.id}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                {deleting === photo.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!loading && selectedRoom && roomPhotos.length === 0 && (
        <div className="flex flex-col items-center py-6 text-gray-400">
          <ImagePlus className="w-8 h-8 mb-2" />
          <p className="text-xs">No photos in {ROOM_TYPES.find(r => r.value === selectedRoom)?.label} yet</p>
        </div>
      )}

      {!loading && !selectedRoom && (
        <div className="flex flex-col items-center py-6 text-gray-400">
          <Camera className="w-8 h-8 mb-2" />
          <p className="text-xs">Select a room above to view or upload photos</p>
        </div>
      )}
    </div>
  );
}
