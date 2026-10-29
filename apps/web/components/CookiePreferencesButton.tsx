'use client';

import { COOKIE_PREFERENCES_EVENT } from '@/lib/analytics-consent';

export function CookiePreferencesButton() {
  return (
    <button
      type='button'
      onClick={() => window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT))}
      className='my-4 rounded-lg bg-emerald-800 px-5 py-3 font-medium text-white hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2'
    >
      Manage cookie preferences
    </button>
  );
}
