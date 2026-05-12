'use client';

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

type Theme = 'default' | 'mint-editorial';

function readThemeCookie(): Theme {
  if (typeof document === 'undefined') return 'default';
  const match = document.cookie.match(/(?:^|;\s*)mintenance-theme=([^;]+)/);
  return match?.[1] === 'mint-editorial' ? 'mint-editorial' : 'default';
}

const OPTIONS: Array<{
  value: Theme;
  title: string;
  description: string;
  swatches: string[];
}> = [
  {
    value: 'default',
    title: 'Default — Navy & Emerald',
    description:
      'The current Mintenance look: deep navy, emerald accents, Inter, cool slate neutrals.',
    swatches: ['#0F172A', '#10B981', '#F8FAFC', '#F59E0B'],
  },
  {
    value: 'mint-editorial',
    title: 'Mint Editorial (preview)',
    description:
      'Calmer Claude-leaning palette: teal-mint, warm near-black, Instrument Serif headlines, paper shadows. Currently applied to the homeowner dashboard only.',
    swatches: ['#3F8C7A', '#1A2520', '#F3F7F4', '#C49A4D'],
  },
];

interface AppearanceSectionProps {
  /** Where to redirect the user after the cookie is set. Defaults to
   *  the homeowner settings appearance section; contractors pass
   *  their own settings path so they don't land on the wrong page. */
  redirectPath?: string;
}

export function AppearanceSection({
  redirectPath = '/settings?section=appearance',
}: AppearanceSectionProps = {}) {
  const [active, setActive] = useState<Theme>('default');

  // Read the cookie on the client only — the page is rendered as a
  // client component so we don't have access to `next/headers`.
  useEffect(() => {
    setActive(readThemeCookie());
  }, []);

  // Encode the redirect path so query strings inside it survive
  // being nested in our own ?redirect= query string. Without this
  // the second `?section=appearance` would split the URL.
  const encodedRedirect = encodeURIComponent(redirectPath);

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-gray-900 mb-2'>Appearance</h1>
        <p className='text-gray-600 mb-6'>
          Choose how Mintenance looks in your browser. The Mint Editorial
          preview is a rolling rebrand — pages migrate one at a time, and the
          rest stay on the current design until they're ready.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {OPTIONS.map((opt) => {
          const isActive = active === opt.value;
          return (
            <a
              key={opt.value}
              href={`/api/theme?value=${opt.value}&redirect=${encodedRedirect}`}
              className={`relative block rounded-xl border-2 p-6 transition-colors ${
                isActive
                  ? 'border-teal-600 bg-teal-50/40'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              aria-current={isActive ? 'true' : undefined}
            >
              {isActive && (
                <span className='absolute top-4 right-4 inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white'>
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
              <div className='flex items-center gap-2 mb-3'>
                {opt.swatches.map((c) => (
                  <span
                    key={c}
                    className='w-6 h-6 rounded-full border border-gray-200'
                    style={{ background: c }}
                    aria-hidden='true'
                  />
                ))}
              </div>
              <h2 className='text-lg font-semibold text-gray-900 mb-1'>
                {opt.title}
              </h2>
              <p className='text-sm text-gray-600'>{opt.description}</p>
              <div className='mt-4 inline-flex items-center text-sm font-medium text-teal-700'>
                {isActive ? 'Active' : 'Use this theme'}
              </div>
            </a>
          );
        })}
      </div>

      <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600'>
        Your choice is stored as a 30-day cookie on this device. Switching
        themes reloads the page; signed-in state and unsaved form input are
        preserved.
      </div>
    </div>
  );
}
