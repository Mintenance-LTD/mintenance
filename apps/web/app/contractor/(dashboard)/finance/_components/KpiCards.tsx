'use client';

import React, { useEffect, useState } from 'react';
import { PoundSterling, Clock, TrendingUp, Banknote } from 'lucide-react';

interface KpiCardsProps {
  thisMonthRevenue: number;
  pendingPayouts: number;
  allTimeRevenue: number;
  avgJobValue: number;
}

export function KpiCards({
  thisMonthRevenue,
  pendingPayouts,
  allTimeRevenue,
  avgJobValue,
}: KpiCardsProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Hydration-safe theme detection — switch to canonical .kpi tiles
  // when the Mint Editorial theme is active. Same pattern used across
  // other contractor surfaces (settings, jobs, quotes, messages).
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div className='kpi'>
          <div className='label'>This month</div>
          <div className='num'>£{fmt(thisMonthRevenue)}</div>
          <div className='sub'>Net after platform + processing fees</div>
        </div>
        <div className='kpi'>
          <div className='label'>Pending payout</div>
          <div className='num'>£{fmt(pendingPayouts)}</div>
          <div className='sub'>Held in escrow</div>
        </div>
        <div className='kpi'>
          <div className='label'>All-time revenue</div>
          <div className='num'>£{fmt(allTimeRevenue)}</div>
          <div className='sub'>Lifetime earnings</div>
        </div>
        <div className='kpi'>
          <div className='label'>Avg job value</div>
          <div className='num'>£{fmt(avgJobValue)}</div>
          <div className='sub'>Per completed job</div>
        </div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
      {/* This Month Revenue */}
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <PoundSterling className='w-5 h-5 text-teal-600' />
          <p className='text-gray-600 text-sm font-medium'>This Month</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>
          £{fmt(thisMonthRevenue)}
        </p>
      </div>

      {/* Pending Payouts */}
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <Clock className='w-5 h-5 text-amber-600' />
          <p className='text-gray-600 text-sm font-medium'>Pending</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>
          £{fmt(pendingPayouts)}
        </p>
      </div>

      {/* All Time Revenue */}
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <TrendingUp className='w-5 h-5 text-green-600' />
          <p className='text-gray-600 text-sm font-medium'>All Time</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>
          £{fmt(allTimeRevenue)}
        </p>
      </div>

      {/* Average Job Value */}
      <div className='bg-white rounded-xl p-4 border border-gray-200'>
        <div className='flex items-center gap-2 mb-2'>
          <Banknote className='w-5 h-5 text-blue-600' />
          <p className='text-gray-600 text-sm font-medium'>Avg Job Value</p>
        </div>
        <p className='text-2xl font-semibold text-gray-900'>
          £{fmt(avgJobValue)}
        </p>
      </div>
    </div>
  );
}
