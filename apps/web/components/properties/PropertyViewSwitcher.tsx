'use client';
import { PROPERTY_VIEWS } from '@mintenance/shared';
import { usePropertyView } from '@/hooks/usePropertyView';
import Link from 'next/link';

export function PropertyViewSwitcher() {
  const { view, setView, enabled, ready, saved } = usePropertyView();
  if (!enabled) return null;
  return (
    <section
      aria-label='Property view'
      className='mb-5 rounded-xl border border-gray-200 bg-white p-3 text-gray-900'
    >
      <div className='flex flex-wrap items-center gap-3'>
        <span className='text-sm font-semibold'>Your view</span>
        <div
          className='flex flex-wrap gap-1'
          role='group'
          aria-label='Choose your view'
        >
          {PROPERTY_VIEWS.map((option) => (
            <button
              key={option.value}
              type='button'
              disabled={!ready}
              aria-pressed={view === option.value}
              onClick={() => setView(option.value)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${view === option.value ? 'bg-teal-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Link
          href='/homeowner/subscription'
          className='ml-auto text-sm font-semibold text-teal-800 underline'
        >
          Plan & features
        </Link>
      </div>
      <p className='mt-2 text-sm text-gray-600'>
        {PROPERTY_VIEWS.find((option) => option.value === view)?.description}{' '}
        Your plan and property permissions still apply.
      </p>
      {!saved && (
        <p role='status' className='mt-1 text-sm text-amber-800'>
          This view is temporary because device storage is unavailable.
        </p>
      )}
    </section>
  );
}
