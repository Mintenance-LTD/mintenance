import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Video Calls | Mintenance',
  description: 'Connect with contractors via video calls for consultations and project discussions.',
};

export default function VideoCallsPage() {
  return (
    <HomeownerPageWrapper>
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh] px-4">
        {/* Back button */}
        <div className="w-full max-w-lg mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Coming soon card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-lg w-full text-center">
          {/* Video icon */}
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">Video Calls</h1>

          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Coming soon
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            We are building video call functionality so you can connect face-to-face with contractors
            for consultations, site assessments and project discussions. Stay tuned for updates.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}