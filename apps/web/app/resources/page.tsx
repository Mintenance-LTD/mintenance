import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
export const metadata = {
  title: 'Resources for tradespeople | Mintenance',
  description:
    'Guidance for getting verified, understanding fees and delivering a job on Mintenance.',
};
const resources = [
  [
    'Get ready to work',
    'Understand business verification and the information to prepare.',
    '/verification',
  ],
  [
    'Understand your fees',
    'Review the available plans and pricing before choosing.',
    '/pricing',
  ],
  [
    'Write a clear proposal',
    'See the details homeowners consider when comparing bids.',
    '/blog/compare-bids',
  ],
  [
    'Finish with confidence',
    'Understand the completion review and payment stages.',
    '/blog/review-completed-work',
  ],
];
export default function Resources() {
  return (
    <>
      <LandingNavigation />
      <main
        id='main-content'
        className='bg-[#f2f7f3] text-[#1b342b] px-6 py-16'
      >
        <div className='max-w-6xl mx-auto'>
          <p className='text-sm tracking-[.18em] uppercase text-[#347968] font-semibold'>
            For tradespeople
          </p>
          <h1 className='max-w-3xl mt-5 font-semibold'>
            Useful guidance.
            <br />
            Less guesswork.
          </h1>
          <p className='max-w-xl mt-6 mb-12 text-lg text-[#53675d]'>
            From setting up your profile to handing over a finished job, find
            the next step here.
          </p>
          <div className='grid sm:grid-cols-2 gap-6'>
            {resources.map(([title, text, href]) => (
              <Link
                key={href}
                href={href}
                className='rounded-3xl border border-[#d7e4dc] bg-white p-8 hover:shadow-lg transition'
              >
                <ArrowUpRight className='mb-8 text-[#347968]' />
                <h2 className='text-2xl font-semibold'>{title}</h2>
                <p className='mt-4 text-[#53675d]'>{text}</p>
              </Link>
            ))}
          </div>
          <p className='mt-10 text-[#53675d]'>
            Have a specific question?{' '}
            <Link
              className='underline font-semibold text-[#286858]'
              href='/contact'
            >
              Contact support
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer2025 />
    </>
  );
}
