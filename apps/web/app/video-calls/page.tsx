import type { Metadata } from 'next';
import React from 'react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Video Calls | Mintenance',
  description: 'Connect with contractors via video calls for consultations and project discussions.',
};

export default function VideoCallsPage() {
  return (
    <HomeownerPageWrapper>
      <div className="w-full space-y-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Video Calls</h1>
          <p className="text-gray-600">Video calls functionality is currently being updated.</p>
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}