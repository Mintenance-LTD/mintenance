'use client';

import React from 'react';
import { skeletonPulse } from '@/lib/animations/variants';
import { MotionDiv } from '@/components/ui/MotionDiv';

export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
      </div>
      <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-4" />
      <div className="h-12 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export function QuickActionsCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-full">
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function ActivityTimelineSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-full bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="h-2 bg-gray-200 rounded-full animate-pulse mb-3" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-100">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className={`h-[${height}px] bg-gray-200 rounded animate-pulse`} />
    </div>
  );
}

export function WelcomeHeroSkeleton() {
  return (
    <div className="relative bg-gradient-hero rounded-2xl p-8 mb-8 overflow-hidden">
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <div className="h-5 w-32 bg-white/20 rounded animate-pulse mb-2" />
            <div className="h-12 w-48 bg-white/20 rounded animate-pulse mb-3" />
            <div className="h-4 w-64 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-32 bg-white/20 rounded-xl animate-pulse" />
            <div className="h-12 w-40 bg-white/20 rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="pt-6 border-t border-white/20">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-8 w-16 bg-white/20 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-white/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto p-8 w-full">
      <div className="space-y-8">
        <WelcomeHeroSkeleton />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            <ChartSkeleton />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <QuickActionsCardSkeleton />
          </div>
        </div>

        <ActivityTimelineSkeleton />
      </div>
    </div>
  );
}
