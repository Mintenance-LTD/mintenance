'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Check } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { Stats } from './types';

interface StatsCardsProps {
  stats: Stats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  // 2026-05-13 polish pass: editorial-branched stats — under Mint
  // Editorial, the 4 stat cards swap to canonical .kpi tiles to match
  // the rest of the contractor surfaces. Legacy users keep the
  // bg-teal-100 / emerald / blue / purple tinted hero variants.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    const weekDeltaColor =
      stats.weekOverWeekChange && stats.weekOverWeekChange > 0
        ? 'var(--me-ok)'
        : 'var(--me-ink-3)';
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div className='kpi'>
          <div className='label'>Upcoming</div>
          <div className='num'>{stats.upcomingAppointments}</div>
          <div className='sub'>Next 7 days</div>
        </div>
        <div className='kpi'>
          <div className='label'>Completed</div>
          <div className='num'>{stats.completedThisWeek}</div>
          <div className='sub' style={{ color: weekDeltaColor }}>
            {stats.weekOverWeekChange
              ? `${stats.weekOverWeekChange > 0 ? '+' : ''}${stats.weekOverWeekChange}% vs last week`
              : 'This week'}
          </div>
        </div>
        <div className='kpi'>
          <div className='label'>Total hours</div>
          <div className='num'>{stats.totalHours}</div>
          <div className='sub'>This week</div>
        </div>
        <div className='kpi'>
          <div className='label'>Available slots</div>
          <div className='num'>{stats.availableSlots}</div>
          <div className='sub'>Next 7 days</div>
        </div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className='bg-white rounded-2xl p-6 border border-slate-200 shadow-sm'
      >
        <div className='flex items-center gap-3 mb-3'>
          <div className='p-3 bg-teal-100 rounded-xl'>
            <Calendar className='w-6 h-6 text-teal-600' />
          </div>
          <p className='text-sm font-semibold text-slate-600'>Upcoming</p>
        </div>
        <p className='text-3xl font-bold text-slate-900'>
          {stats.upcomingAppointments}
        </p>
        <p className='text-xs text-slate-500 mt-1'>Next 7 days</p>
      </MotionDiv>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className='bg-white rounded-2xl p-6 border border-slate-200 shadow-sm'
      >
        <div className='flex items-center gap-3 mb-3'>
          <div className='p-3 bg-emerald-100 rounded-xl'>
            <Check className='w-6 h-6 text-emerald-600' />
          </div>
          <p className='text-sm font-semibold text-slate-600'>Completed</p>
        </div>
        <p className='text-3xl font-bold text-slate-900'>
          {stats.completedThisWeek}
        </p>
        <p
          className={`text-xs mt-1 ${stats.weekOverWeekChange && stats.weekOverWeekChange > 0 ? 'text-emerald-600' : 'text-slate-500'}`}
        >
          {stats.weekOverWeekChange
            ? `${stats.weekOverWeekChange > 0 ? '+' : ''}${stats.weekOverWeekChange}% vs last week`
            : 'This week'}
        </p>
      </MotionDiv>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className='bg-white rounded-2xl p-6 border border-slate-200 shadow-sm'
      >
        <div className='flex items-center gap-3 mb-3'>
          <div className='p-3 bg-blue-100 rounded-xl'>
            <Clock className='w-6 h-6 text-blue-600' />
          </div>
          <p className='text-sm font-semibold text-slate-600'>Total Hours</p>
        </div>
        <p className='text-3xl font-bold text-slate-900'>{stats.totalHours}</p>
        <p className='text-xs text-slate-500 mt-1'>This week</p>
      </MotionDiv>

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className='bg-white rounded-2xl p-6 border border-slate-200 shadow-sm'
      >
        <div className='flex items-center gap-3 mb-3'>
          <div className='p-3 bg-purple-100 rounded-xl'>
            <Calendar className='w-6 h-6 text-purple-600' />
          </div>
          <p className='text-sm font-semibold text-slate-600'>
            Available Slots
          </p>
        </div>
        <p className='text-3xl font-bold text-slate-900'>
          {stats.availableSlots}
        </p>
        <p className='text-xs text-slate-500 mt-1'>Next 7 days</p>
      </MotionDiv>
    </div>
  );
}
