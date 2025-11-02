'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface Photo {
  id: string;
  file_url: string;
  file_name?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Ensure photos is always an array
  const safePhotos = Array.isArray(photos) ? photos : [];

  if (!isMounted) {
    // Return a placeholder during SSR to prevent hydration mismatch
    return (
      <div style={{
        textAlign: 'center',
        padding: theme.spacing[8],
        color: theme.colors.textSecondary,
      }}>
        <div style={{ width: 48, height: 48, margin: '0 auto' }} />
        <p style={{ marginTop: theme.spacing[2], margin: 0 }}>Loading photos...</p>
      </div>
    );
  }

  if (!safePhotos || safePhotos.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: theme.spacing[8],
        color: theme.colors.textSecondary,
      }}>
        <Icon name="image" size={48} color={theme.colors.textTertiary} />
        <p style={{ marginTop: theme.spacing[2], margin: 0 }}>No photos uploaded yet</p>
      </div>
    );
  }

  const openModal = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closeModal = () => {
    setSelectedPhotoIndex(null);
  };

  const nextPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex + 1) % safePhotos.length);
    }
  };

  const prevPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex - 1 + safePhotos.length) % safePhotos.length);
    }
  };

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: theme.spacing[3],
      }}>
        {safePhotos.map((photo, index) => (
          <div
            key={photo.id}
            onClick={() => openModal(index)}
            style={{
              aspectRatio: '1',
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.backgroundSecondary,
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <img
              src={photo.file_url}
              alt={photo.file_name || `Job photo ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
              padding: theme.spacing[2],
              color: 'white',
              fontSize: theme.typography.fontSize.xs,
            }}>
              Photo {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedPhotoIndex !== null && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing[4],
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
            }}
          >
            <img
              src={safePhotos[selectedPhotoIndex].file_url}
              alt={safePhotos[selectedPhotoIndex].file_name || `Job photo ${selectedPhotoIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: theme.borderRadius.lg,
              }}
            />
            
            {/* Close Button */}
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: theme.spacing[2],
                right: theme.spacing[2],
                width: '40px',
                height: '40px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: theme.typography.fontWeight.bold,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
              }}
            >
              ×
            </button>

            {/* Navigation Buttons */}
            {safePhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  style={{
                    position: 'absolute',
                    left: theme.spacing[2],
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                  }}
                >
                  <Icon name="arrowLeft" size={24} color="white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  style={{
                    position: 'absolute',
                    right: theme.spacing[2],
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                  }}
                >
                  <Icon name="arrowRight" size={24} color="white" />
                </button>
              </>
            )}

            {/* Photo Counter */}
            <div style={{
              position: 'absolute',
              bottom: theme.spacing[2],
              left: '50%',
              transform: 'translateX(-50%)',
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              fontSize: theme.typography.fontSize.sm,
            }}>
              {selectedPhotoIndex + 1} / {safePhotos.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

