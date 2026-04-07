'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AppScreen {
  mobile: string;
  desktop?: string;
  title: string;
  description: string;
  bullets: string[];
}

const HOMEOWNER_SCREENS: AppScreen[] = [
  {
    mobile: '/screenshots/mobile/homeowner-dashboard.png',
    desktop: '/screenshots/homeowner/dashboard.png',
    title: 'Your Command Centre',
    description: 'Everything you need at a glance. See active jobs, pending bids, and project updates the moment you open the app.',
    bullets: [
      'Track active, completed, and posted jobs',
      'Review contractor bids with one tap',
      'See your active projects with real photos',
    ],
  },
  {
    mobile: '/screenshots/mobile/homeowner-properties.png',
    desktop: '/screenshots/homeowner/job-progress.png',
    title: 'Full Job Visibility',
    description: 'Follow every step of your project from posting to payment. No guessing, no chasing — you always know where things stand.',
    bullets: [
      'Real-time job progress timeline',
      'Manage all your properties in one place',
      'Before and after photo comparison',
    ],
  },
];

const CONTRACTOR_SCREENS: AppScreen[] = [
  {
    mobile: '/screenshots/mobile/contractor-marketplace.png',
    desktop: '/screenshots/contractor/discover-jobs.png',
    title: 'Find Work That Pays',
    description: 'A curated feed of local jobs matched to your trade. Filter by distance, budget, and category. Bid on what suits you.',
    bullets: [
      'Browse jobs on a map or card view',
      'See budgets, categories, and distances upfront',
      'Quick Bid directly from the feed',
    ],
  },
  {
    mobile: '/screenshots/mobile/contractor-find-jobs.png',
    desktop: '/screenshots/contractor/discover-jobs.png',
    title: 'Jobs on the Map',
    description: 'See exactly where work is. Filter by trade — plumbing, electrical, roofing, and more. Plan efficient routes between jobs.',
    bullets: [
      'Map view with job pins and your location',
      'Filter by trade, distance, and budget',
      'Tap any pin for instant job details',
    ],
  },
  {
    mobile: '/screenshots/mobile/contractor-dashboard.png',
    desktop: '/screenshots/contractor/dashboard.png',
    title: 'Your Business at a Glance',
    description: 'Track earnings, completion rate, active pipeline, and success rate. Know how your business is performing — not a guess, real data.',
    bullets: [
      'Revenue overview with monthly breakdown',
      'Active jobs pipeline and pending payouts',
      'Rating, success rate, and quick actions',
    ],
  },
  {
    mobile: '/screenshots/mobile/contractor-business-hub.png',
    desktop: '/screenshots/contractor/marketing.png',
    title: 'Run Your Entire Business',
    description: 'Finance, invoices, quotes, CRM, expenses, payouts, calendar, and time tracking — all in one app. Replace five tools with one.',
    bullets: [
      'Create and send professional invoices',
      'Track expenses and manage client relationships',
      'Monitor your marketing performance and bid win rate',
    ],
  },
];

function ScreenShowcase({
  screens,
  roleName,
  accent,
  accentBg,
}: {
  screens: AppScreen[];
  roleName: string;
  accent: string;
  accentBg: string;
}) {
  const [current, setCurrent] = useState(0);
  const screen = screens[current];

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(screens.length - 1, c + 1));

  return (
    <div>
      {/* Role header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className={`text-sm font-semibold ${accent} uppercase tracking-wider`}>{roleName} App</p>
          <p className="text-xs text-gray-500">{screens.length} screens to explore</p>
        </div>
        {/* Arrows */}
        <div className="flex gap-2">
          <button
            onClick={prev}
            disabled={current === 0}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 transition-all"
            aria-label="Previous screen"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={current === screens.length - 1}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 transition-all"
            aria-label="Next screen"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content: text left, screenshots right */}
      <div className="grid lg:grid-cols-2 gap-10 items-center min-h-[480px]">
        {/* Text side */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">{screen.title}</h3>
          <p className="text-gray-600 leading-relaxed mb-6">{screen.description}</p>
          <ul className="space-y-3">
            {screen.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className={`mt-1 w-5 h-5 rounded-full ${accentBg} flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-3 h-3 ${accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-gray-700 text-sm">{b}</span>
              </li>
            ))}
          </ul>

          {/* Dots */}
          <div className="flex gap-2 mt-8">
            {screens.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? `${accentBg.replace('/10', '/100').replace('bg-teal-50', 'bg-teal-500').replace('bg-emerald-50', 'bg-emerald-500')} w-6` : 'bg-gray-200 w-2'
                }`}
                style={i === current ? { backgroundColor: accent.includes('teal') ? '#0d9488' : '#059669' } : {}}
                aria-label={`Screen ${i + 1}: ${screens[i].title}`}
              />
            ))}
          </div>
        </div>

        {/* Screenshot side */}
        <div className="relative">
          {/* Desktop frame — primary, full width */}
          {screen.desktop && (
            <div className="bg-gray-900 rounded-xl p-1.5 shadow-2xl">
              <div className="flex items-center gap-1 px-2 py-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="flex-1 mx-2 h-3.5 bg-gray-700 rounded" />
              </div>
              <div className="rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screen.desktop}
                  alt={`${screen.title} — desktop view`}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Phone frame — floating bottom-left over the desktop */}
          <div className={`${screen.desktop ? 'absolute -bottom-8 -left-6 z-10' : 'mx-auto'} w-36 sm:w-44 rounded-[1.5rem] overflow-hidden shadow-2xl border-4 border-gray-800 bg-gray-800`}>
            <div className="flex justify-center py-1 bg-gray-800">
              <div className="w-12 h-1 bg-gray-700 rounded-full" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screen.mobile}
              alt={`${screen.title} — mobile view`}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppScreenshotCarousel() {
  const [activeRole, setActiveRole] = useState<'homeowner' | 'contractor'>('homeowner');

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-2">
            Coming to iOS &amp; Android
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            A Sneak Peek at the App
          </h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            Real screens from the Mintenance app. What you see is what you get.
          </p>

          {/* Role tabs */}
          <div className="inline-flex bg-gray-100 rounded-xl p-1 mt-8">
            <button
              onClick={() => setActiveRole('homeowner')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeRole === 'homeowner'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Homeowner
            </button>
            <button
              onClick={() => setActiveRole('contractor')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeRole === 'contractor'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Contractor
            </button>
          </div>
        </div>

        {activeRole === 'homeowner' ? (
          <ScreenShowcase
            screens={HOMEOWNER_SCREENS}
            roleName="Homeowner"
            accent="text-teal-600"
            accentBg="bg-teal-50"
          />
        ) : (
          <ScreenShowcase
            screens={CONTRACTOR_SCREENS}
            roleName="Contractor"
            accent="text-emerald-600"
            accentBg="bg-emerald-50"
          />
        )}
      </div>
    </section>
  );
}
