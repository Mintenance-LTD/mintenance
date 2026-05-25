'use client';

import { ArrowLeft, Check } from 'lucide-react';

// Verbatim copy from the mobile HomeownerSetupScreen CONCERN_OPTIONS
// array — keep the chip labels identical so the data persisted to
// profiles.settings.concern_tags merges cleanly across surfaces.
const CHIPS: string[] = [
  'Boiler service',
  'Plumbing',
  'Garden',
  'Electrical',
  'Painting',
  'Cleaning',
];

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  onBack: () => void;
  onFinish: () => void;
  onSkip: () => void;
  saving: boolean;
}

export function ConcernsStep({
  value,
  onChange,
  onBack,
  onFinish,
  onSkip,
  saving,
}: Props) {
  function toggle(chip: string) {
    if (value.includes(chip)) {
      onChange(value.filter((c) => c !== chip));
    } else {
      onChange([...value, chip]);
    }
  }

  return (
    <div className='card card-pad space-y-6'>
      <div>
        <p className='t-eyebrow mb-2 text-[var(--me-mint)]'>Step 2 of 2</p>
        <h1 className='t-h1 mb-2'>What&apos;s first on your list?</h1>
        <p className='t-body text-[var(--me-ink-2)]'>
          Pick as many as you like — you can change this later.
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        {CHIPS.map((chip) => {
          const selected = value.includes(chip);
          return (
            <button
              key={chip}
              type='button'
              aria-pressed={selected}
              onClick={() => toggle(chip)}
              className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
                selected
                  ? 'border-[var(--me-mint)] bg-[var(--me-mint)] text-white'
                  : 'border-[var(--me-line)] bg-white text-[var(--me-ink-1)] hover:border-[var(--me-ink-3)]'
              }`}
            >
              {selected && <Check className='h-3.5 w-3.5' aria-hidden />}
              {chip}
            </button>
          );
        })}
      </div>

      <div className='flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between'>
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onBack}
            disabled={saving}
            className='btn-secondary inline-flex items-center gap-2 disabled:opacity-50'
          >
            <ArrowLeft className='h-4 w-4' aria-hidden />
            Back
          </button>
          <button
            type='button'
            onClick={onSkip}
            disabled={saving}
            className='t-meta text-[var(--me-ink-2)] hover:text-[var(--me-ink-1)] disabled:opacity-50'
          >
            Skip for now →
          </button>
        </div>
        <button
          type='button'
          onClick={onFinish}
          disabled={saving}
          className='btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {saving ? 'Saving…' : 'Finish setup'}
        </button>
      </div>
    </div>
  );
}
