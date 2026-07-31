'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Briefcase } from 'lucide-react';
import { MotionArticle } from '@/components/ui/MotionDiv';
import { cardHover } from '@/lib/animations/variants';
import { formatMoney } from '@/lib/utils/currency';
import type { Job } from '../types';

interface Props {
  job: Job;
}

const PRIORITY_COLORS: Record<string, string> = {
  emergency: 'bg-rose-100 text-rose-700 border-rose-600',
  high: 'bg-emerald-100 text-emerald-700 border-emerald-600',
  medium: 'bg-amber-100 text-amber-700 border-amber-600',
  low: 'bg-blue-100 text-blue-700 border-blue-600',
};

function getPriorityColor(priority: string): string {
  return (
    PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-700 border-gray-600'
  );
}

/**
 * Single job card for the contractor /jobs grid. Extracted from
 * `page.tsx` on 2026-05-09 (AUDIT_PUNCH_LIST P2 #42). Status branch
 * at the bottom switches between "Manage Job" (assigned/in-progress
 * /completed) and the "View Details + Submit Bid" pair (open jobs).
 */
export function JobCard({ job }: Props) {
  const isAssignedOrLater = ['assigned', 'in_progress', 'completed'].includes(
    job.status
  );

  return (
    <MotionArticle
      className='bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'
      variants={cardHover}
      initial='rest'
      whileHover='hover'
      layout
    >
      {/* Image */}
      {job.photos.length > 0 ? (
        <div className='relative h-48 bg-gray-200'>
          <Image
            src={job.photos[0]}
            alt={job.title}
            fill
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            className='object-cover'
          />
          {job.photos.length > 1 && (
            <div className='absolute bottom-2 right-2 px-3 py-1 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg'>
              +{job.photos.length - 1}{' '}
              {job.photos.length - 1 === 1 ? 'photo' : 'photos'}
            </div>
          )}
        </div>
      ) : (
        <div className='h-48 bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center'>
          <svg
            className='w-16 h-16 text-teal-300'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
            />
          </svg>
        </div>
      )}

      <div className='p-6'>
        {/* Header */}
        <div className='flex items-start justify-between gap-3 mb-3'>
          <h3 className='text-lg font-bold text-gray-900 line-clamp-2'>
            {job.title}
          </h3>
          {job.matchScore && job.matchScore > 80 && (
            <div className='flex-shrink-0 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg'>
              {job.matchScore}% Match
            </div>
          )}
        </div>

        <p className='text-sm text-gray-600 line-clamp-2 mb-4'>
          {job.description}
        </p>

        <div className='flex flex-wrap items-center gap-2 mb-4'>
          <span className='px-3 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-lg capitalize'>
            {job.category}
          </span>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-lg border-2 ${getPriorityColor(job.priority)}`}
          >
            {job.priority.toUpperCase()}
          </span>
          {job.distance && (
            <span className='px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg flex items-center gap-1'>
              <MapPin size={12} /> {job.distance.toFixed(1)} mi
            </span>
          )}
        </div>

        <div className='flex items-center justify-between mb-4 pb-4 border-b border-gray-200'>
          <div>
            <div className='text-xs text-gray-500 mb-1'>Budget</div>
            <div className='text-xl font-bold text-gray-900'>
              {formatMoney(job.budget, 'GBP')}
            </div>
          </div>
          <div className='text-right'>
            <div className='text-xs text-gray-500 mb-1'>Location</div>
            <div className='text-sm font-medium text-gray-700'>
              {(job.location || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center'>
            {job.homeowner.avatar ? (
              <Image
                src={job.homeowner.avatar}
                alt={job.homeowner.name}
                width={40}
                height={40}
                className='rounded-full object-cover'
              />
            ) : (
              <span className='text-teal-600 font-semibold'>
                {job.homeowner.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className='flex-1'>
            <div className='text-sm font-medium text-gray-900'>
              {job.homeowner.name}
            </div>
            <div className='text-xs text-gray-500'>Homeowner</div>
          </div>
        </div>

        <div className='flex gap-3'>
          {isAssignedOrLater ? (
            <Link
              href={`/contractor/jobs/${job.id}`}
              className='flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium text-center hover:bg-teal-700 transition-colors flex items-center justify-center gap-2'
            >
              <Briefcase size={16} />
              {job.status === 'completed' ? 'View Job' : 'Manage Job'}
            </Link>
          ) : (
            <>
              <Link
                href={`/contractor/bid/${job.id}/details`}
                className='flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-200 transition-colors'
              >
                View Details
              </Link>
              <Link
                href={`/contractor/bid/${job.id}`}
                className='flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-medium text-center hover:bg-teal-700 transition-colors'
              >
                Submit Bid
              </Link>
            </>
          )}
        </div>
      </div>
    </MotionArticle>
  );
}
