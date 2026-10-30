'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Upload, Loader2, ImagePlus } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  ROOM_PHOTO_TYPES as ROOM_TYPES,
  groupRoomPhotoAlbums,
  uploadedPhotoLabel,
  type DatedRoomPhoto as RoomPhoto,
} from '@mintenance/shared';

interface RoomPhotoGalleryProps {
  propertyId: string;
}

export default function RoomPhotoGallery({
  propertyId,
}: RoomPhotoGalleryProps) {
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState('all');
  const requestId = useRef(0);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(false);
    setPhotos([]);
    try {
      const res = await fetch(`/api/properties/${propertyId}/room-photos`);
      if (!res.ok) throw new Error('Photos unavailable');
      const data = await res.json();
      if (!Array.isArray(data.photos)) throw new Error('Invalid response');
      if (request === requestId.current) {
        setPhotos(data.photos);
        setSelectedDate('all');
      }
    } catch {
      if (request === requestId.current) setError(true);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void fetchPhotos();
    return () => {
      requestId.current++;
    };
  }, [fetchPhotos]);

  const handleUpload = async (files: FileList) => {
    if (!selectedRoom || !files.length) return;
    if (
      files.length > 10 ||
      Array.from(files).some((file) => file.size > 5 * 1024 * 1024)
    ) {
      toast.error('Choose up to 10 photos, each smaller than 5 MB.');
      return;
    }
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('room_type', selectedRoom);
      Array.from(files).forEach((f) => formData.append('photos', f));

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

      toast.success(
        `${data.uploaded} photo${data.uploaded > 1 ? 's' : ''} uploaded`
      );
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
    if (!window.confirm('Delete this room photo? This cannot be undone.'))
      return;
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

  const roomPhotos = photos.filter((photo) => photo.room_type === selectedRoom);
  const albums = groupRoomPhotoAlbums(photos, selectedRoom ?? '');
  const visibleAlbums = albums.filter(
    (album) => selectedDate === 'all' || album.date === selectedDate
  );
  const totalPhotos = photos.length;

  return (
    <div className='p-5 bg-white border border-gray-200 rounded-xl h-full'>
      <div className='flex items-center gap-2 mb-3'>
        <Camera className='w-4 h-4 text-teal-600' />
        <h4 className='text-sm font-semibold text-gray-900'>Room Photos</h4>
        <span className='text-xs text-gray-600 ml-auto'>
          {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
        </span>
      </div>

      <p className='text-xs text-gray-500 mb-3'>
        Albums group photos by upload date (UTC). When a photo was taken is not
        recorded.
      </p>

      <div className='mb-4 flex flex-wrap items-end gap-2'>
        <label className='min-w-0 flex-1 basis-36 text-xs font-semibold text-gray-700'>
          Room
          <select
            value={selectedRoom ?? ''}
            onChange={(event) => {
              setSelectedRoom(event.target.value || null);
              setSelectedDate('all');
            }}
            className='mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm'
          >
            <option value=''>Choose a room</option>
            {ROOM_TYPES.map((room) => {
              const count = photos.filter(
                (photo) => photo.room_type === room.value
              ).length;
              return (
                <option key={room.value} value={room.value}>
                  {room.label}
                  {count > 0 ? ' (' + count + ')' : ''}
                </option>
              );
            })}
          </select>
        </label>
        {!loading && !error && albums.length > 1 && (
          <label className='min-w-0 flex-1 basis-40 text-xs font-semibold text-gray-700'>
            Upload date (UTC)
            <select
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className='mt-1 block min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm'
            >
              <option value='all'>All dates</option>
              {albums.map((album) => (
                <option key={album.date} value={album.date}>
                  {album.label} ({album.photos.length})
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedRoom && (
          <>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp,image/gif'
              multiple
              className='hidden'
              onChange={(event) =>
                event.target.files && handleUpload(event.target.files)
              }
            />
            <button
              type='button'
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label={
                'Upload photos to ' +
                ROOM_TYPES.find((room) => room.value === selectedRoom)?.label
              }
              className='flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50'
            >
              {uploading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Upload className='h-4 w-4' />
              )}
              {uploading ? 'Uploading…' : 'Add photos'}
            </button>
          </>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className='flex items-center justify-center py-6'>
          <Loader2 className='w-5 h-5 animate-spin text-gray-600' />
        </div>
      )}

      {error && (
        <div
          role='alert'
          className='rounded-lg bg-red-50 p-3 text-sm text-red-900'
        >
          Photos could not be loaded.{' '}
          <button
            type='button'
            className='min-h-11 underline font-semibold'
            onClick={() => void fetchPhotos()}
          >
            Retry photos
          </button>
        </div>
      )}
      {!loading &&
        !error &&
        visibleAlbums.map((album) => (
          <section key={album.date} className='mb-5' aria-label={album.label}>
            <h5 className='mb-2 text-sm font-semibold text-gray-900'>
              {album.label} · {album.photos.length} photo
              {album.photos.length === 1 ? '' : 's'}
            </h5>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {album.photos.map((photo) => (
                <figure
                  key={photo.id}
                  className='min-w-0 rounded-lg border border-gray-200 overflow-hidden'
                >
                  <a
                    href={photo.photo_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`View ${photo.file_name || 'room photo'} full size`}
                    className='relative block aspect-[4/3] bg-gray-100 focus-visible:outline focus-visible:outline-2'
                  >
                    <Image
                      src={photo.photo_url}
                      alt={photo.file_name || 'Room photo'}
                      fill
                      className='object-contain'
                      sizes='(max-width: 640px) 90vw, 400px'
                    />
                  </a>
                  <figcaption className='p-2 text-xs text-gray-700 break-words'>
                    {uploadedPhotoLabel(photo.created_at)}
                  </figcaption>
                  <button
                    type='button'
                    onClick={() => handleDelete(photo.id)}
                    disabled={deleting === photo.id}
                    aria-label={`Delete ${photo.file_name || 'room photo'}`}
                    className='min-h-11 w-full text-xs font-semibold text-red-800 hover:bg-red-50'
                  >
                    {deleting === photo.id ? 'Deleting…' : 'Delete photo'}
                  </button>
                </figure>
              ))}
            </div>
          </section>
        ))}

      {/* Empty states */}
      {!loading && !error && selectedRoom && roomPhotos.length === 0 && (
        <div className='flex flex-col items-center py-6 text-gray-600'>
          <ImagePlus className='w-8 h-8 mb-2' />
          <p className='text-xs'>
            No photos in{' '}
            {ROOM_TYPES.find((r) => r.value === selectedRoom)?.label} yet
          </p>
        </div>
      )}

      {!loading && !error && !selectedRoom && (
        <div className='flex flex-col items-center py-6 text-gray-600'>
          <Camera className='w-8 h-8 mb-2' />
          <p className='text-xs'>
            Select a room above to view or upload photos
          </p>
        </div>
      )}
    </div>
  );
}
