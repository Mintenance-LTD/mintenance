'use client';

/* eslint-disable @next/next/no-img-element */
// next/image needs a remotePatterns allow-list for signed Supabase
// URLs that rotate; we stay on plain <img> consistent with the rest
// of the homeowner pages.

import React, { useState } from 'react';
import Link from 'next/link';
import { Camera, Plus, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import type { PropertyShape } from './MintEditorialPropertyCards';

export function PhotoHero({ property }: { property: PropertyShape }) {
  const photos = property.images;
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    // Compact horizontal empty state — icon left, copy middle, CTA right.
    return (
      <div
        className='card'
        style={{
          padding: '24px',
          marginBottom: 18,
          background: 'var(--me-bg-2)',
          borderStyle: 'dashed',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'var(--me-surface)',
            color: 'var(--me-ink-3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Camera size={24} strokeWidth={1.5} />
        </span>
        <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
          <h2 className='t-h4'>No photos yet</h2>
          <p className='t-body' style={{ fontSize: 13 }}>
            Add a couple of photos so this property is easy to recognise across
            jobs.
          </p>
        </div>
        <Link
          href={`/properties/${property.id}/edit`}
          className='btn btn-primary btn-sm'
        >
          <Plus size={14} strokeWidth={2} /> Add photos
        </Link>
      </div>
    );
  }

  const current = photos[index];
  const total = photos.length;
  const showCarousel = total > 1;
  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + total) % total);

  return (
    <div
      className='card'
      style={{
        overflow: 'hidden',
        padding: 0,
        marginBottom: 18,
        position: 'relative',
      }}
    >
      <img
        src={current}
        alt={`${property.name} photo ${index + 1} of ${total}`}
        style={{
          width: '100%',
          height: 320,
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {/* Top-right gallery counter pill — canonical "1/14" */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'rgba(15, 30, 28, 0.62)',
          color: 'var(--me-on-brand)',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <Images size={12} strokeWidth={2} />
        {index + 1}/{total}
      </div>
      {/* Top-left "Add photo" pill — quick action to /edit */}
      <Link
        href={`/properties/${property.id}/edit`}
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.92)',
          color: 'var(--me-ink)',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Plus size={12} strokeWidth={2} />
        Add photo
      </Link>
      {showCarousel ? (
        <>
          <button
            type='button'
            aria-label='Previous photo'
            onClick={() => go(-1)}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(15, 30, 28, 0.55)',
              color: 'var(--me-on-brand)',
              border: 'none',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type='button'
            aria-label='Next photo'
            onClick={() => go(1)}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(15, 30, 28, 0.55)',
              color: 'var(--me-on-brand)',
              border: 'none',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </>
      ) : null}
    </div>
  );
}
