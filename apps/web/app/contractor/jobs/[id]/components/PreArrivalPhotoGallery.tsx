'use client';

/**
 * Pre-arrival photo gallery for the contractor.
 *
 * Mounted at the top of the body when the contractor is at the
 * `ready_to_start` or `in_progress` stage — the windows where they're
 * either about to head out OR mid-job and might want to confirm
 * "before" state without scrolling to the Customer brief.
 *
 * Renders a hero image + up to four thumbnail strip and a
 * click-to-zoom lightbox. Photos come straight from the existing
 * jobPhotoUrls prop (the same source as Customer brief) so there's
 * no extra fetch.
 *
 * Returns null when there are no photos — silence is the right UX
 * when the homeowner skipped the photo step.
 */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Camera, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

interface PreArrivalPhotoGalleryProps {
  jobPhotoUrls: string[];
  jobTitle: string;
}

export function PreArrivalPhotoGallery({
  jobPhotoUrls,
  jobTitle,
}: PreArrivalPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((i) =>
          i === null ? null : (i + 1) % jobPhotoUrls.length
        );
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) =>
          i === null
            ? null
            : (i - 1 + jobPhotoUrls.length) % jobPhotoUrls.length
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, jobPhotoUrls.length]);

  if (jobPhotoUrls.length === 0) return null;

  const [hero, ...rest] = jobPhotoUrls;
  const thumbs = rest.slice(0, 4);
  const extraCount = jobPhotoUrls.length - 1 - thumbs.length;

  return (
    <>
      <div className='card card-pad'>
        <div className='col' style={{ gap: 12 }}>
          <div
            className='between'
            style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
          >
            <div className='row' style={{ gap: 8, alignItems: 'center' }}>
              <Camera
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--me-brand)' }}
              />
              <h3 className='t-h3' style={{ margin: 0 }}>
                What you&apos;ll find on arrival
              </h3>
            </div>
            <span className='t-meta'>
              {jobPhotoUrls.length} photo{jobPhotoUrls.length === 1 ? '' : 's'}{' '}
              from the homeowner
            </span>
          </div>

          {/* Hero image */}
          <button
            type='button'
            onClick={() => setLightboxIndex(0)}
            aria-label='Open hero photo'
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--me-bg-2)',
              border: '1px solid var(--me-line)',
              padding: 0,
              cursor: 'zoom-in',
              display: 'block',
            }}
          >
            <Image
              src={hero}
              alt={`${jobTitle} — main photo`}
              fill
              sizes='(max-width: 768px) 100vw, 600px'
              style={{ objectFit: 'cover' }}
              priority
            />
            <span
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background:
                  'color-mix(in srgb, var(--me-ink) 70%, transparent)',
                color: 'var(--me-on-brand)',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Maximize2 size={11} strokeWidth={2} /> Tap to zoom
            </span>
          </button>

          {/* Thumb strip */}
          {thumbs.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${thumbs.length}, 1fr)`,
                gap: 8,
              }}
            >
              {thumbs.map((url, i) => {
                const isLastWithMore =
                  i === thumbs.length - 1 && extraCount > 0;
                return (
                  <button
                    key={url + i}
                    type='button'
                    onClick={() => setLightboxIndex(i + 1)}
                    aria-label={`Open photo ${i + 2}`}
                    style={{
                      position: 'relative',
                      aspectRatio: '4 / 3',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: 'var(--me-bg-2)',
                      border: '1px solid var(--me-line)',
                      padding: 0,
                      cursor: 'zoom-in',
                    }}
                  >
                    <Image
                      src={url}
                      alt={`${jobTitle} — photo ${i + 2}`}
                      fill
                      sizes='150px'
                      style={{ objectFit: 'cover' }}
                    />
                    {isLastWithMore ? (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'color-mix(in srgb, var(--me-ink) 55%, transparent)',
                          color: 'var(--me-on-brand)',
                          fontSize: 18,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        +{extraCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightboxIndex !== null ? (
        <div
          role='dialog'
          aria-modal='true'
          aria-label='Photo lightbox'
          onClick={() => setLightboxIndex(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'color-mix(in srgb, var(--me-ink) 92%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            cursor: 'zoom-out',
          }}
        >
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            aria-label='Close lightbox'
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              color: 'var(--me-on-brand)',
              cursor: 'pointer',
              padding: 8,
            }}
          >
            <X size={24} strokeWidth={2} />
          </button>

          {jobPhotoUrls.length > 1 ? (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) =>
                  i === null
                    ? null
                    : (i - 1 + jobPhotoUrls.length) % jobPhotoUrls.length
                );
              }}
              aria-label='Previous photo'
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background:
                  'color-mix(in srgb, var(--me-on-brand) 18%, transparent)',
                border: 'none',
                color: 'var(--me-on-brand)',
                cursor: 'pointer',
                padding: 12,
                borderRadius: '50%',
              }}
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
          ) : null}

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 1100,
              aspectRatio: '4 / 3',
              cursor: 'default',
            }}
          >
            <Image
              src={jobPhotoUrls[lightboxIndex]}
              alt={`${jobTitle} — photo ${lightboxIndex + 1}`}
              fill
              sizes='(max-width: 1100px) 100vw, 1100px'
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>

          {jobPhotoUrls.length > 1 ? (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) =>
                  i === null ? null : (i + 1) % jobPhotoUrls.length
                );
              }}
              aria-label='Next photo'
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background:
                  'color-mix(in srgb, var(--me-on-brand) 18%, transparent)',
                border: 'none',
                color: 'var(--me-on-brand)',
                cursor: 'pointer',
                padding: 12,
                borderRadius: '50%',
              }}
            >
              <ChevronRight size={24} strokeWidth={2} />
            </button>
          ) : null}

          <span
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'var(--me-on-brand)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {lightboxIndex + 1} / {jobPhotoUrls.length}
          </span>
        </div>
      ) : null}
    </>
  );
}
