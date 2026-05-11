'use client';

/* eslint-disable @next/next/no-img-element */
// next/image needs a remotePatterns allow-list for signed Supabase
// URLs that rotate; we stay on plain <img> consistent with the rest
// of the homeowner pages.

import Link from 'next/link';
import { Camera, Plus } from 'lucide-react';
import type { PropertyShape } from './MintEditorialPropertyCards';

export function PhotoHero({ property }: { property: PropertyShape }) {
  const photo = property.images[0];
  if (photo) {
    return (
      <div
        className='card'
        style={{ overflow: 'hidden', padding: 0, marginBottom: 18 }}
      >
        <img
          src={photo}
          alt={property.name}
          style={{
            width: '100%',
            height: 320,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }
  // Compact horizontal empty state — icon left, copy middle, CTA right.
  // Replaces the previous ~400px-tall centered placeholder block.
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
