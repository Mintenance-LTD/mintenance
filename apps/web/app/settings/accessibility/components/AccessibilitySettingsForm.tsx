'use client';

/**
 * AccessibilitySettingsForm — Silver-mode toggle on web.
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md.
 */

import React from 'react';
import { useSilverMode } from '@/lib/hooks/useSilverMode';

export function AccessibilitySettingsForm() {
  const { silverMode, toggle, loading } = useSilverMode();

  return (
    <section className='bg-white border border-gray-200 rounded-xl p-6 max-w-2xl'>
      <div className='flex items-start justify-between gap-6'>
        <div>
          <h2 className='text-lg font-semibold text-gray-900 mb-1'>
            Silver mode
          </h2>
          <p className='text-sm text-gray-600 max-w-md'>
            Larger fonts and bigger taps across key flows. Best if you find the
            standard layout hard to read or hit on a touchscreen.
          </p>
        </div>
        <button
          role='switch'
          aria-checked={silverMode}
          onClick={() => {
            if (!loading) void toggle();
          }}
          disabled={loading}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
            silverMode ? 'bg-teal-600' : 'bg-gray-300'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              silverMode ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </section>
  );
}

export default AccessibilitySettingsForm;
