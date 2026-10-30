'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { PROPERTY_VIEWS } from '@mintenance/shared';
import { usePropertyView } from '@/hooks/usePropertyView';
import Link from 'next/link';

export function PropertyViewSwitcher() {
  const { view, setView, enabled, ready, saved } = usePropertyView();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  if (!enabled) return null;
  return (
    <div
      ref={root}
      className='relative shrink-0 text-gray-900'
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type='button'
        disabled={!ready}
        aria-label={`Change property view, current: ${PROPERTY_VIEWS.find((option) => option.value === view)?.label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className='flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
      >
        {PROPERTY_VIEWS.find((option) => option.value === view)?.label}
        <ChevronDown size={16} aria-hidden='true' />
      </button>
      {open && (
        <section
          id={id}
          aria-label='Choose your view'
          className='absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-6rem)] max-h-[70dvh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl'
        >
          <p className='px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
            Your view
          </p>
          {PROPERTY_VIEWS.map((option) => (
            <button
              key={option.value}
              type='button'
              aria-pressed={view === option.value}
              onClick={() => {
                setView(option.value);
                setOpen(false);
                trigger.current?.focus();
              }}
              className='flex min-h-11 w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-teal-50 focus-visible:outline focus-visible:outline-2'
            >
              {option.label}
              {view === option.value && <Check size={16} aria-hidden='true' />}
            </button>
          ))}
          <p className='mt-2 border-t border-gray-100 px-2 pt-3 text-xs text-gray-600'>
            Your plan and property permissions still apply.
          </p>
          <Link
            href='/homeowner/subscription'
            className='flex min-h-11 items-center px-2 text-sm font-semibold text-teal-800 underline'
          >
            Plan & features
          </Link>
          {!saved && (
            <p role='status' className='px-2 text-xs text-amber-800'>
              This view is temporary because device storage is unavailable.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
