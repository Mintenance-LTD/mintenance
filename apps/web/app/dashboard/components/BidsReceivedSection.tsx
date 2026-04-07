'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatMoney } from '@/lib/utils/currency';
import { Star, ArrowRight } from 'lucide-react';

interface PendingBid {
  id: string;
  amount: number;
  jobId: string;
  jobTitle: string;
  contractorName: string;
  contractorImage?: string;
  createdAt: string;
}

function toRelativeTimeString(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function BidsReceivedSection({
  pendingBids,
}: {
  pendingBids: PendingBid[];
}) {
  if (pendingBids.length === 0) return null;

  return (
    <div className='px-4 sm:px-6 lg:px-8'>
      <div className='bg-white rounded-2xl border border-amber-200 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center'>
              <Star className='w-4 h-4 text-amber-600' />
            </div>
            <h2 className='text-xl font-semibold text-gray-900'>
              Bids Received ({pendingBids.length})
            </h2>
          </div>
        </div>
        <p className='text-gray-600 text-sm mb-4'>
          Review bids from contractors and accept the best one for your project
        </p>
        <div className='space-y-3'>
          {pendingBids.map((bid) => (
            <div
              key={bid.id}
              className='flex items-center gap-4 p-4 bg-gray-50 hover:bg-amber-50 rounded-xl transition-colors border border-gray-100'
            >
              <div className='flex-shrink-0'>
                {bid.contractorImage ? (
                  <div className='w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm'>
                    <Image
                      src={bid.contractorImage}
                      alt={bid.contractorName}
                      width={48}
                      height={48}
                      className='object-cover'
                    />
                  </div>
                ) : (
                  <div className='w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center border-2 border-white shadow-sm'>
                    <span className='text-sm font-bold text-teal-700'>
                      {bid.contractorName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                  </div>
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='font-semibold text-gray-900 truncate'>
                  {bid.contractorName}
                </p>
                <p className='text-sm text-gray-600 truncate'>
                  for {bid.jobTitle}
                </p>
                <p className='text-xs text-gray-500 mt-0.5'>
                  {toRelativeTimeString(bid.createdAt)}
                </p>
              </div>
              <div className='flex-shrink-0 text-right'>
                <p className='text-xl font-bold text-gray-900'>
                  {formatMoney(bid.amount, 'GBP')}
                </p>
              </div>
              <Link
                href={`/jobs/${bid.jobId}`}
                className='flex-shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-1'
              >
                Review
                <ArrowRight className='w-4 h-4' />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
