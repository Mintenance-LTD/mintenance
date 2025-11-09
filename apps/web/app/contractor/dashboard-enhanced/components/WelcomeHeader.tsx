'use client';

import { theme } from '@/lib/theme';
import { useState, useEffect } from 'react';
import { Briefcase, PoundSterling } from 'lucide-react';

interface WelcomeHeaderProps {
  contractorFullName: string;
  activeJobsCount: number;
  pendingBidsCount: number;
  thisMonthRevenue: number;
}

export function WelcomeHeader({
  contractorFullName,
  activeJobsCount,
  pendingBidsCount,
  thisMonthRevenue,
}: WelcomeHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-2xl p-8 border border-primary-700/50 shadow-xl mb-8">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

      <div className="relative z-10">
        <div className="flex items-start justify-between flex-wrap gap-6">
          {/* Greeting Section */}
          <div className="flex-1 min-w-0">
            <h2 className="text-heading-md font-[640] text-white mb-3 tracking-tighter">
              {greeting}, {contractorFullName.split(' ')[0] || contractorFullName}
            </h2>
            <p className="text-base font-[460] text-gray-300 leading-[1.5]">
              Here's what's happening with your business today
            </p>
          </div>

          {/* Quick Stats - Modern Pills */}
          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center gap-2.5 hover:bg-white/20 transition-colors">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm font-[560] text-white">{activeJobsCount} active</span>
            </div>
            <div className="px-4 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center gap-2.5 hover:bg-white/20 transition-colors">
              <Briefcase className="h-4 w-4 text-white" />
              <span className="text-sm font-[560] text-white">{pendingBidsCount} bids</span>
            </div>
          </div>
        </div>

        {/* Revenue Highlight - Modern Design */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-white/80" />
            <span className="text-sm font-[560] text-gray-300 uppercase tracking-wider">This Month Revenue</span>
          </div>
            <span className="text-4xl font-[640] text-white tracking-tight">
              £{thisMonthRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
