'use client';

import React from 'react';

// Loading Skeleton
export const InvoiceCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded-lg w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded-lg w-48" />
        </div>
      </div>
      <div className="w-8 h-8 bg-gray-200 rounded-lg" />
    </div>
    <div className="h-px bg-gray-200 my-4" />
    <div className="flex justify-between">
      <div>
        <div className="h-8 bg-gray-200 rounded-lg w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded-lg w-48" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded-lg w-24" />
        <div className="h-10 bg-gray-200 rounded-lg w-32" />
      </div>
    </div>
  </div>
);
