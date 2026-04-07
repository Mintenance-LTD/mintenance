'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HOMEOWNER_SCREENS = [
  { src: '/screenshots/mobile/homeowner-dashboard.png', label: 'Dashboard', desc: 'Track active projects & bids' },
  { src: '/screenshots/mobile/homeowner-properties.png', label: 'Properties', desc: 'Manage your rental portfolio' },
];

const CONTRACTOR_SCREENS = [
  { src: '/screenshots/mobile/contractor-marketplace.png', label: 'Job Marketplace', desc: 'Curated jobs tailored to you' },
  { src: '/screenshots/mobile/contractor-find-jobs.png', label: 'Find Jobs Map', desc: 'Browse nearby jobs on a map' },
  { src: '/screenshots/mobile/contractor-dashboard.png', label: 'Dashboard', desc: 'Track earnings & pipeline' },
  { src: '/screenshots/mobile/contractor-business-hub.png', label: 'Business Hub', desc: 'Finance, invoices, CRM & more' },
];

function PhoneCarousel({
  screens,
  role,
  accent,
}: {
  screens: typeof HOMEOWNER_SCREENS;
  role: string;
  accent: string;
}) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (index: number) => {
    const next = Math.max(0, Math.min(index, screens.length - 1));
    setCurrent(next);
    scrollRef.current?.children[next]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  };

  return (
    <div className="text-center">
      <p className={`text-sm font-semibold ${accent} uppercase tracking-wider mb-1`}>
        {role}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        {screens[current].desc}
      </p>

      {/* Phone frame with scrollable screens */}
      <div className="relative inline-block">
        {/* Phone bezel */}
        <div className="w-52 sm:w-64 rounded-[2rem] overflow-hidden shadow-2xl border-[5px] border-gray-800 bg-gray-800">
          {/* Notch */}
          <div className="flex justify-center py-1.5 bg-gray-800">
            <div className="w-20 h-1.5 bg-gray-700 rounded-full" />
          </div>

          {/* Scrollable screen area */}
          <div
            ref={scrollRef}
            className="flex overflow-x-hidden snap-x snap-mandatory"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {screens.map((screen, i) => (
              <div
                key={screen.src}
                className="flex-shrink-0 w-full snap-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screen.src}
                  alt={`${role} — ${screen.label}: ${screen.desc}`}
                  className="w-full h-auto"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {screens.length > 1 && (
          <>
            <button
              onClick={() => scrollTo(current - 1)}
              disabled={current === 0}
              className="absolute left-[-28px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-default transition-opacity"
              aria-label="Previous screen"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTo(current + 1)}
              disabled={current === screens.length - 1}
              className="absolute right-[-28px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-default transition-opacity"
              aria-label="Next screen"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {screens.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? 'bg-teal-600 w-5' : 'bg-gray-300'
              }`}
              aria-label={`Go to screen ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Screen label */}
      <p className="text-sm font-medium text-gray-900 mt-3">
        {screens[current].label}
      </p>
    </div>
  );
}

export function AppScreenshotCarousel() {
  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-2">
            Coming to iOS &amp; Android
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            A Sneak Peek at the App
          </h2>
          <p className="text-gray-500 mt-3 max-w-md mx-auto text-sm">
            Swipe through real screens from both apps. What you see is what you get.
          </p>
        </div>

        <div className="flex justify-center items-start gap-8 sm:gap-16">
          <PhoneCarousel
            screens={HOMEOWNER_SCREENS}
            role="Homeowner"
            accent="text-teal-600"
          />
          <PhoneCarousel
            screens={CONTRACTOR_SCREENS}
            role="Contractor"
            accent="text-emerald-600"
          />
        </div>
      </div>
    </section>
  );
}
