'use client';

import {
  Home,
  Building,
  Building2,
  Hotel,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react';
import type { PropertyType } from '../HomeownerOnboardingWizard';

interface Option {
  key: PropertyType;
  label: string;
  icon: typeof Home;
}

// Mirrors the mobile HomeownerSetupScreen tiles (house / flat / terrace /
// bungalow) plus the two additional values the
// /api/users/profile schema already accepts (maisonette, other).
const OPTIONS: Option[] = [
  { key: 'house', label: 'House', icon: Home },
  { key: 'flat', label: 'Flat', icon: Building },
  { key: 'bungalow', label: 'Bungalow', icon: Hotel },
  { key: 'maisonette', label: 'Maisonette', icon: Building2 },
  { key: 'other', label: 'Something else', icon: MoreHorizontal },
];

interface Props {
  value: PropertyType | null;
  onChange: (value: PropertyType) => void;
  onNext: () => void;
  onSkip: () => void;
}

export function PropertyTypeStep({ value, onChange, onNext, onSkip }: Props) {
  return (
    <div className='card card-pad space-y-6'>
      <div>
        <p className='t-eyebrow mb-2 text-[var(--me-mint)]'>Step 1 of 2</p>
        <h1 className='t-h1 mb-2'>What kind of home?</h1>
        <p className='t-body text-[var(--me-ink-2)]'>
          Helps us match you with the right trades.
        </p>
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3' role='radiogroup'>
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.key;
          return (
            <button
              key={opt.key}
              type='button'
              role='radio'
              aria-checked={selected}
              onClick={() => onChange(opt.key)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
                selected
                  ? 'border-[var(--me-mint)] bg-[var(--me-mint)]/5'
                  : 'border-[var(--me-line)] bg-white hover:border-[var(--me-ink-3)]'
              }`}
            >
              <Icon
                className='h-6 w-6'
                style={{
                  color: selected ? 'var(--me-mint)' : 'var(--me-ink-2)',
                }}
                aria-hidden
              />
              <span className='text-sm font-medium'>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className='flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between'>
        <button
          type='button'
          onClick={onSkip}
          className='t-meta text-[var(--me-ink-2)] hover:text-[var(--me-ink-1)]'
        >
          Skip for now →
        </button>
        <button
          type='button'
          onClick={onNext}
          disabled={!value}
          className='btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50'
        >
          Continue
          <ArrowRight className='h-4 w-4' aria-hidden />
        </button>
      </div>
    </div>
  );
}
