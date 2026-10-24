'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  onboardingPersonas,
  PERSONA_LABELS,
  guidesForPersona,
  type FeatureGuide,
  type OnboardingPersona,
} from '@mintenance/shared';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { EarlyAccessSummary } from './EarlyAccessSummary';

export function GuideHub({
  userId,
  role,
  initialPersona,
  initialGuide,
}: {
  userId: string;
  role: string;
  initialPersona?: string;
  initialGuide?: string;
}) {
  const personas = onboardingPersonas(role);
  const [persona, setPersona] = useState<OnboardingPersona>(
    personas.find((p) => p === initialPersona) ?? personas[0] ?? 'homeowner'
  );
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialGuide ?? null);
  const guides = guidesForPersona(persona);
  const current = guides.find((g) => g.id === selected) ?? guides[0];
  const nextGuide = guides[guides.findIndex((g) => g.id === current?.id) + 1];
  return (
    <main
      data-theme='mint-editorial'
      className='me-root min-h-screen bg-[var(--me-bg)] p-4 text-[var(--me-ink)] sm:p-8'
    >
      <div className='mx-auto max-w-5xl space-y-6'>
        <Link
          className='underline'
          href={
            role === 'admin'
              ? '/admin/dashboard'
              : role === 'contractor'
                ? '/contractor/dashboard-enhanced'
                : '/dashboard'
          }
        >
          Back to dashboard
        </Link>
        <h1 className='text-3xl font-semibold'>Getting started</h1>
        <p>
          Choose how you use Mintenance. Read a short guide when you need it,
          and come back at any time. Access to features depends on your account
          and permissions.
        </p>
        <EarlyAccessSummary userId={userId} role={role} />
        <label className='block'>
          My guide
          <select
            className='ml-3 rounded-lg border border-[var(--me-line)] bg-[var(--me-surface)] p-3'
            value={persona}
            onChange={(e) => {
              setPersona(e.target.value as OnboardingPersona);
              setSelected(null);
            }}
          >
            {personas.map((p) => (
              <option key={p} value={p}>
                {PERSONA_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label className='block'>
          Find a feature
          <input
            className='mt-2 block w-full rounded-lg border border-[var(--me-line)] bg-[var(--me-surface)] p-3'
            type='search'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='For example: payments, invitations or photos'
          />
        </label>
        {current && (
          <GuideDetail
            key={`${persona}:${current.id}`}
            guide={current}
            persona={persona}
            userId={userId}
          />
        )}
        {nextGuide && (
          <button
            type='button'
            className='min-h-11 underline'
            onClick={() => setSelected(nextGuide.id)}
          >
            Next guide: {nextGuide.title}
          </button>
        )}
        <div className='grid gap-3 sm:grid-cols-2'>
          {guides
            .filter((g) =>
              `${g.title} ${g.steps.join(' ')}`
                .toLowerCase()
                .includes(search.toLowerCase())
            )
            .map((g) => (
              <button
                key={g.id}
                type='button'
                aria-pressed={selected === g.id}
                className='rounded-xl border border-[var(--me-line)] bg-[var(--me-surface)] p-4 text-left focus-visible:outline-2 focus-visible:outline-[var(--me-brand)]'
                onClick={() => setSelected(g.id)}
              >
                <span className='font-semibold'>{g.title}</span>
                <span className='mt-1 block text-sm'>{g.steps[0]}</span>
              </button>
            ))}
        </div>
        <p className='text-sm'>
          Reading a guide marks the guidance as read. It does not mark your
          actual setup or job as complete.
        </p>
      </div>
    </main>
  );
}
function GuideDetail({
  guide,
  persona,
  userId,
}: {
  guide: FeatureGuide;
  persona: OnboardingPersona;
  userId: string;
}) {
  const progress = useJourneyProgress(userId, `guide-${persona}-${guide.id}`);
  return (
    <section
      aria-label={guide.title}
      className='rounded-2xl border border-[var(--me-line)] bg-[var(--me-surface)] p-6'
    >
      <h2 className='text-xl font-semibold'>{guide.title}</h2>
      <ol className='my-4 list-decimal space-y-3 pl-6'>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className='flex flex-wrap items-center gap-4'>
        <Link className='underline' href={guide.href}>
          Open feature
        </Link>
        <button
          type='button'
          className='min-h-11 rounded-full bg-[var(--me-brand)] px-5 text-white'
          onClick={() =>
            void progress.save({
              status: 'completed',
              step: guide.steps.length,
            })
          }
        >
          Mark guide as read
        </button>
        {progress.progress?.status === 'completed' && (
          <span role='status'>
            Read{progress.progress.pending ? ' — sync pending' : ''}
          </span>
        )}
      </div>
      {progress.error && (
        <p role='status'>
          {progress.error}{' '}
          <button
            type='button'
            className='underline'
            onClick={() => void progress.retry()}
          >
            Retry
          </button>
        </p>
      )}
    </section>
  );
}
