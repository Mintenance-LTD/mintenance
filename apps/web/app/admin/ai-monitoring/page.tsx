'use client';

import React from 'react';
import { UnifiedSidebar } from '@/components/layouts/UnifiedSidebar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { AIMonitoringClient } from './components/AIMonitoringClient';

export default function AIMonitoringPage() {
  const { user } = useCurrentUser();

  const userDisplayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user?.email || '';

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
      <UnifiedSidebar
        userRole="admin"
        userInfo={{
          name: userDisplayName,
          email: user?.email || '',
          avatar: (user as any)?.profile_image_url,
        }}
      />

      <main className="flex flex-col flex-1 ml-[240px]">
        {/* Hero Header */}
        <MotionDiv
          className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="max-w-[1600px] mx-auto px-8 py-12">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-1">AI Agent Monitoring</h1>
                  <p className="text-purple-100 text-lg">Real-time performance metrics and insights</p>
                </div>
              </div>

              {/* Info Badge */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                <div className="text-sm text-purple-100 mb-1">System Status</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-white font-semibold">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Main Content */}
        <AIMonitoringClient />
      </main>
    </div>
  );
}
