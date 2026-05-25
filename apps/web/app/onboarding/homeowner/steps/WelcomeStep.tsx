'use client';

import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Sparkles, ArrowRight } from 'lucide-react';

interface CTA {
  title: string;
  body: string;
  icon: typeof PlusCircle;
  href: string;
}

// Same three destinations as mobile's WelcomeFirstJobModal so the
// post-onboarding choice is consistent across surfaces.
const CTAS: CTA[] = [
  {
    title: 'Post your first job',
    body: 'Describe what you need, add a photo, get bids in minutes.',
    icon: PlusCircle,
    href: '/jobs/create',
  },
  {
    title: 'Browse trades near you',
    body: 'See contractors in your area before you commit.',
    icon: Search,
    href: '/contractors',
  },
  {
    title: 'Ask Mint AI anything',
    body: 'Get a quick second opinion on what the work might involve.',
    icon: Sparkles,
    href: '/dashboard?ai=open',
  },
];

interface Props {
  firstName: string | null;
}

export function WelcomeStep({ firstName }: Props) {
  const router = useRouter();
  const greeting = firstName ? `You're in, ${firstName}.` : "You're in.";

  return (
    <div className='space-y-6'>
      <div className='card card-pad space-y-2 text-center'>
        <p className='t-eyebrow text-[var(--me-mint)]'>Welcome to Mintenance</p>
        <h1 className='t-h1'>{greeting}</h1>
        <p className='t-body text-[var(--me-ink-2)]'>
          Three quick ways to get going. Or take the scenic route and explore.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        {CTAS.map((cta) => {
          const Icon = cta.icon;
          return (
            <button
              key={cta.title}
              type='button'
              onClick={() => router.push(cta.href)}
              className='card card-pad group flex flex-col items-start gap-3 text-left transition hover:border-[var(--me-mint)]'
            >
              <Icon className='h-6 w-6 text-[var(--me-mint)]' aria-hidden />
              <h2 className='text-base font-semibold'>{cta.title}</h2>
              <p className='t-meta text-[var(--me-ink-2)]'>{cta.body}</p>
              <span className='mt-auto inline-flex items-center gap-1 text-sm font-medium text-[var(--me-mint)] opacity-0 transition group-hover:opacity-100'>
                Open
                <ArrowRight className='h-4 w-4' aria-hidden />
              </span>
            </button>
          );
        })}
      </div>

      <div className='text-center'>
        <button
          type='button'
          onClick={() => router.push('/dashboard')}
          className='t-meta text-[var(--me-ink-2)] hover:text-[var(--me-ink-1)]'
        >
          Or skip to your dashboard →
        </button>
      </div>
    </div>
  );
}
