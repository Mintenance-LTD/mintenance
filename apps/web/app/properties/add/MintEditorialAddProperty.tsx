'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * Mint Editorial port of /properties/add.
 *
 * Canonical layout (property-management.html lines 637-741): 2-col
 * grid — form on the left with .field inputs, right rail with a
 * Street-view placeholder + Mint AI "From the Land Registry" card +
 * privacy note. Same data shape and handlers as the legacy form;
 * this component is purely presentational.
 *
 * The canonical mock includes a 4-step progress strip but the actual
 * form below is a single screen. We follow the same one-screen
 * pattern + progress affordance so we don't have to invent a real
 * wizard state machine for fields the schema doesn't need (year
 * built, systems, etc.). The API accepts what we collect today.
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  Building2,
  Home as HomeIcon,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export interface AddPropertyFormData {
  name: string;
  propertyType: string;
  address: string;
  city: string;
  postcode: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  images: File[];
}

const PROPERTY_TYPES = [
  { value: 'house', label: 'House', Icon: HomeIcon },
  { value: 'apartment', label: 'Apartment', Icon: Building2 },
  { value: 'condo', label: 'Condo', Icon: Building },
  { value: 'townhouse', label: 'Townhouse', Icon: HomeIcon },
] as const;

interface Props {
  formData: AddPropertyFormData;
  imagePreviews: string[];
  isSubmitting: boolean;
  onInputChange: (field: keyof AddPropertyFormData, value: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function MintEditorialAddProperty({
  formData,
  imagePreviews,
  isSubmitting,
  onInputChange,
  onImageUpload,
  onRemoveImage,
  onSubmit,
}: Props) {
  const router = useRouter();

  return (
    <HomeownerPageWrapper>
      <Link
        href='/properties'
        className='btn btn-ghost btn-sm'
        style={{ marginBottom: 14 }}
      >
        <ArrowLeft size={14} strokeWidth={1.75} /> Back to properties
      </Link>

      <div className='between' style={{ marginBottom: 22, gap: 16 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>
            Add a <em>property</em>
          </h1>
          <p className='t-body'>
            Tell us the basics — Mint pulls everything else (council tax band,
            EPC, last sale price) from the address.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
          gap: 22,
          alignItems: 'flex-start',
        }}
      >
        {/* ───────── Left column: form ───────── */}
        <div className='col' style={{ gap: 18 }}>
          {/* Name */}
          <div className='card card-pad'>
            <label className='t-eyebrow' style={{ marginBottom: 8 }}>
              Property name
            </label>
            <input
              type='text'
              required
              className='field'
              placeholder='e.g. 12 Albion Road'
              value={formData.name}
              onChange={(e) => onInputChange('name', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Type picker */}
          <div className='card card-pad'>
            <label className='t-eyebrow' style={{ marginBottom: 10 }}>
              Property type
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
              }}
            >
              {PROPERTY_TYPES.map((t) => {
                const selected = formData.propertyType === t.value;
                return (
                  <button
                    key={t.value}
                    type='button'
                    onClick={() => onInputChange('propertyType', t.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      padding: '16px 8px',
                      borderRadius: 12,
                      border: selected
                        ? '2px solid var(--me-brand)'
                        : '1px solid var(--me-line)',
                      background: selected
                        ? 'var(--me-brand-soft)'
                        : 'var(--me-surface)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: selected ? 'var(--me-brand)' : 'var(--me-ink-2)',
                    }}
                  >
                    <t.Icon size={24} strokeWidth={1.5} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Address */}
          <div className='card card-pad'>
            <label className='t-eyebrow' style={{ marginBottom: 10 }}>
              Address
            </label>
            <div className='col' style={{ gap: 10 }}>
              <input
                type='text'
                required
                className='field'
                placeholder='Street address'
                value={formData.address}
                onChange={(e) => onInputChange('address', e.target.value)}
              />
              <div className='row' style={{ gap: 10 }}>
                <input
                  type='text'
                  className='field'
                  placeholder='City'
                  value={formData.city}
                  onChange={(e) => onInputChange('city', e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  type='text'
                  className='field'
                  placeholder='Postcode'
                  value={formData.postcode}
                  onChange={(e) => onInputChange('postcode', e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          {/* Details — bedrooms/bathrooms/sq m */}
          <div className='card card-pad'>
            <label className='t-eyebrow' style={{ marginBottom: 10 }}>
              The basics
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <label className='col' style={{ gap: 4 }}>
                <span className='t-meta'>Bedrooms</span>
                <input
                  type='number'
                  min='0'
                  className='field'
                  placeholder='0'
                  value={formData.bedrooms}
                  onChange={(e) => onInputChange('bedrooms', e.target.value)}
                />
              </label>
              <label className='col' style={{ gap: 4 }}>
                <span className='t-meta'>Bathrooms</span>
                <input
                  type='number'
                  min='0'
                  step='0.5'
                  className='field'
                  placeholder='0'
                  value={formData.bathrooms}
                  onChange={(e) => onInputChange('bathrooms', e.target.value)}
                />
              </label>
              <label className='col' style={{ gap: 4 }}>
                <span className='t-meta'>Square metres</span>
                <input
                  type='number'
                  min='0'
                  className='field'
                  placeholder='0'
                  value={formData.squareFeet}
                  onChange={(e) => onInputChange('squareFeet', e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Photos */}
          <div className='card card-pad'>
            <label className='t-eyebrow' style={{ marginBottom: 10 }}>
              Photos
            </label>
            <div
              style={{
                border: '1.5px dashed var(--me-line)',
                borderRadius: 12,
                padding: '32px 20px',
                background: 'var(--me-bg-2)',
                textAlign: 'center',
              }}
            >
              <Upload
                size={28}
                strokeWidth={1.5}
                style={{
                  color: 'var(--me-ink-3)',
                  display: 'inline-block',
                  marginBottom: 8,
                }}
              />
              <div>
                <label style={{ cursor: 'pointer' }}>
                  <span style={{ color: 'var(--me-brand)', fontWeight: 600 }}>
                    Upload photos
                  </span>
                  <span
                    className='t-body'
                    style={{ fontSize: 13, color: 'var(--me-ink-2)' }}
                  >
                    {' '}
                    or drop them here
                  </span>
                  <input
                    type='file'
                    multiple
                    accept='image/*'
                    onChange={onImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <p
                className='t-meta'
                style={{ fontSize: 11, marginTop: 6, margin: 0 }}
              >
                PNG / JPG up to 10MB each
              </p>
            </div>

            {imagePreviews.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid var(--me-line)',
                    }}
                  >
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type='button'
                      onClick={() => onRemoveImage(index)}
                      aria-label='Remove photo'
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--me-surface)',
                        border: '1px solid var(--me-line)',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Submit row */}
          <div className='between' style={{ marginTop: 4 }}>
            <button
              type='button'
              className='btn btn-ghost'
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={
                isSubmitting ||
                !formData.name.trim() ||
                !formData.address.trim()
              }
            >
              {isSubmitting ? 'Saving…' : 'Save property'}
            </button>
          </div>
        </div>

        {/* ───────── Right column: map placeholder + AI card + privacy ───────── */}
        <aside
          className='col'
          style={{
            gap: 14,
            position: 'sticky',
            top: 84,
            alignSelf: 'start',
          }}
        >
          <div
            className='card'
            style={{
              overflow: 'hidden',
              padding: 0,
            }}
          >
            <div
              className='placeholder-img'
              style={{
                height: 200,
                borderRadius: 0,
                border: 'none',
                borderBottom: '1px solid var(--me-line-2)',
              }}
            >
              Street view · enters once saved
            </div>
            <div className='card-pad'>
              <h3 className='t-h4'>
                {formData.address.trim() || 'Your new address'}
              </h3>
              <p className='t-meta'>
                {[formData.city, formData.postcode].filter(Boolean).join(' · ')
                  ? `${[formData.city, formData.postcode].filter(Boolean).join(' · ')} · UK`
                  : 'Add the address on the left to see a preview.'}
              </p>
            </div>
          </div>

          <div
            className='card card-pad'
            style={{
              background:
                'linear-gradient(180deg, var(--me-brand-soft) 0%, var(--me-surface) 60%)',
              border: '1px solid var(--me-brand-soft)',
            }}
          >
            <div className='row' style={{ gap: 10, marginBottom: 8 }}>
              <Sparkles
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--me-brand)' }}
              />
              <h4 className='t-h4'>What Mint will fill in</h4>
            </div>
            <p
              className='t-body'
              style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}
            >
              Once you save, I&apos;ll auto-pull council tax band, EPC rating,
              last sale price, and any conservation-area / listed status from
              the Land Registry. Saves you typing.
            </p>
          </div>

          <div className='card card-pad'>
            <div className='t-eyebrow' style={{ marginBottom: 8 }}>
              Privacy
            </div>
            <p
              className='t-body'
              style={{ fontSize: 12, lineHeight: 1.55, margin: 0 }}
            >
              Your full address is only shared with contractors after you accept
              a bid. Until then they see the postcode area only.
            </p>
          </div>
        </aside>
      </form>
    </HomeownerPageWrapper>
  );
}
