'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn } from '@/lib/animations/variants';
import { logger } from '@mintenance/shared';

interface BidJobDetailsPanelProps {
  job: {
    id?: string;
    title: string;
    description?: string;
    budget?: string;
    location?: string;
    category?: string;
    createdAt?: string;
    photos?: string[];
    homeowner?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      profile_image_url?: string;
    };
  };
  homeownerName: string;
}

/**
 * Property Rooms Slice 1 — labels mirror the homeowner-side picker
 * so contractors see the same names.
 */
const BID_ROOM_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  living_room: 'Living room',
  dining_room: 'Dining room',
  garage: 'Garage',
  garden: 'Garden',
  exterior: 'Exterior',
  roof: 'Roof',
  hallway: 'Hallway',
  office: 'Office',
  utility: 'Utility',
  other: 'Other',
};

interface JobRoomScope {
  id: string;
  property_room_id: string | null;
  name: string;
  room_type: string;
  size_sqm_at_post: number | null;
}

export function BidJobDetailsPanel({
  job,
  homeownerName,
}: BidJobDetailsPanelProps) {
  // Property Rooms Slice 1 — fetch the job's room scope (if any).
  // RLS on job_rooms gates visibility to job participants + anyone
  // who can read a 'posted'/'published' job, so the contractor sees
  // exactly what the homeowner picked at post time.
  const [rooms, setRooms] = useState<JobRoomScope[]>([]);
  const jobId = job?.id;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/rooms`, {
          credentials: 'include',
        });
        if (!res.ok) return; // 404 / 403 — quietly hide block
        const json = await res.json();
        if (!cancelled) {
          setRooms((json.rooms ?? []) as JobRoomScope[]);
        }
      } catch (e) {
        logger.warn('Bid panel: load job_rooms failed', {
          service: 'app',
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const totalSqm = rooms.reduce<number>(
    (sum, r) => sum + (r.size_sqm_at_post ?? 0),
    0
  );
  const anySized = rooms.some((r) => r.size_sqm_at_post != null);

  return (
    <MotionDiv
      className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-6'
      variants={fadeIn}
      initial='initial'
      animate='animate'
    >
      <h2 className='text-xl font-bold text-gray-900 mb-4'>Job Details</h2>

      {/* Reserve fixed height to prevent CLS when photos load */}
      {job?.photos && job.photos.length > 0 && (
        <div
          className='mb-4 grid grid-cols-2 gap-2'
          style={{ minHeight: '8rem', contentVisibility: 'auto' }}
        >
          {job.photos.slice(0, 4).map((photo, index) => (
            <div
              key={index}
              className='relative h-32 rounded-lg overflow-hidden bg-gray-100'
            >
              <Image
                src={photo}
                alt={'Job photo ' + (index + 1)}
                fill
                className='object-cover'
                sizes='(max-width: 768px) 50vw, 200px'
              />
            </div>
          ))}
        </div>
      )}

      <h3 className='font-bold text-gray-900 mb-2'>{job?.title}</h3>
      <p className='text-sm text-gray-600 mb-4'>{job?.description}</p>

      {/* Property Rooms Slice 1 — rooms-in-scope block. Renders only
          when the homeowner picked specific rooms; the panel falls
          back to its legacy layout for jobs without room scope. */}
      {rooms.length > 0 ? (
        <div className='mb-4 p-3 rounded-xl border border-gray-200 bg-gray-50'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
              Rooms in scope
            </span>
            {anySized && totalSqm > 0 ? (
              <span className='text-xs font-semibold text-gray-700'>
                {totalSqm.toFixed(1)} m² total
              </span>
            ) : null}
          </div>
          <ul className='space-y-1'>
            {rooms.map((r) => (
              <li
                key={r.id}
                className='flex items-center justify-between text-sm'
              >
                <span className='min-w-0 flex-1 truncate text-gray-900'>
                  <span className='text-gray-500'>
                    {BID_ROOM_TYPE_LABELS[r.room_type] ?? r.room_type}
                    {' · '}
                  </span>
                  {r.name}
                </span>
                <span className='ml-3 shrink-0 text-gray-600'>
                  {r.size_sqm_at_post != null
                    ? `${Number(r.size_sqm_at_post).toFixed(1)} m²`
                    : '— m²'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className='space-y-3 mb-6'>
        <div className='flex items-center gap-2 text-sm text-gray-600'>
          <svg
            className='w-4 h-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
            />
          </svg>
          {job?.location || 'Location not specified'}
        </div>
        <div className='flex items-center gap-2 text-sm text-gray-600'>
          <svg
            className='w-4 h-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
            />
          </svg>
          {job?.category || 'General'}
        </div>
        <div className='flex items-center gap-2 text-sm font-semibold text-emerald-600'>
          <svg
            className='w-4 h-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          {/* 2026-05-22: homeowner-set budget no longer displayed to
              contractors. Price your bid based on the work itself. */}
          Price this bid yourself
        </div>
      </div>

      {/* Homeowner Info */}
      <div className='pt-4 border-t border-gray-200'>
        <p className='text-xs text-gray-500 mb-2'>Posted by</p>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center'>
            {job?.homeowner?.profile_image_url ? (
              <Image
                src={job.homeowner.profile_image_url}
                alt={homeownerName}
                width={40}
                height={40}
                className='rounded-full'
              />
            ) : (
              <span className='text-teal-600 font-semibold'>
                {homeownerName?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className='font-medium text-gray-900'>{homeownerName}</p>
            <p className='text-xs text-gray-500'>
              {job?.createdAt
                ? new Date(job.createdAt).toLocaleDateString('en-GB', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently posted'}
            </p>
          </div>
        </div>
      </div>

      {/* Bidding Tips */}
      <div className='mt-6 p-4 bg-teal-50 rounded-xl border border-teal-200'>
        <div className='flex items-center gap-2 mb-2'>
          <svg
            className='w-5 h-5 text-teal-600'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
          </svg>
          <span className='font-semibold text-teal-900'>Bidding Tips</span>
        </div>
        <ul className='text-xs text-teal-800 space-y-1'>
          <li>• Be competitive but fair with pricing</li>
          <li>• Outline your timeline and availability</li>
          <li>• Highlight relevant experience</li>
          <li>• Keep your tone professional</li>
        </ul>
      </div>
    </MotionDiv>
  );
}
