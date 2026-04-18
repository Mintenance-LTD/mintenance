/**
 * /learn — public 60-second how-to video catalogue.
 *
 * R3 #20 of docs/RETENTION_ROADMAP_2026.md. Videos shown as placeholders
 * until the content production pass lands (videoUrl=null in cards.ts).
 */

import type { Metadata } from 'next';
import { PlayCircle, Clock } from 'lucide-react';
import { LandingNavigation } from '@/app/components/landing/LandingNavigation';
import { Footer2025 } from '@/app/components/landing/Footer2025';
import { LEARNING_CARDS } from './cards';

export const metadata: Metadata = {
  title: 'Learn | Mintenance',
  description:
    'Short, practical how-to videos for contractors and homeowners using Mintenance.',
};

export default function LearnPage() {
  return (
    <div className='min-h-screen bg-white'>
      <LandingNavigation />

      <section className='pt-20 pb-10 bg-gradient-to-b from-white to-gray-50'>
        <div className='max-w-4xl mx-auto px-6'>
          <div className='inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5'>
            <PlayCircle className='w-3.5 h-3.5' />
            Learn
          </div>
          <h1 className='text-4xl sm:text-5xl font-bold text-gray-900 mb-4'>
            60-second how-tos
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl'>
            Straight answers to the questions we get most from contractors and
            homeowners. Keep your phone in one hand; watch in under a minute.
          </p>
        </div>
      </section>

      <section className='py-12'>
        <div className='max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-5'>
          {LEARNING_CARDS.map((c) => (
            <article
              key={c.id}
              className='rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow'
            >
              <div className='aspect-video bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-teal-800'>
                <PlayCircle className='w-14 h-14 opacity-60' />
              </div>
              <div className='p-5'>
                <div className='inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2'>
                  <Clock className='w-3.5 h-3.5' />
                  {c.durationSeconds}s · for{' '}
                  {c.audience === 'all' ? 'everyone' : c.audience + 's'}
                </div>
                <h3 className='font-semibold text-gray-900 mb-1'>{c.title}</h3>
                <p className='text-sm text-gray-600 leading-relaxed'>
                  {c.description}
                </p>
                {!c.videoUrl && (
                  <p className='mt-3 text-xs font-semibold uppercase tracking-wide text-amber-600'>
                    Coming soon
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer2025 />
    </div>
  );
}
