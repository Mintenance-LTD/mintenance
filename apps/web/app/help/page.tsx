import Link from 'next/link';
import { ArrowUpRight, BookOpen, MessageCircle } from 'lucide-react';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
export const metadata = {
  title: 'Help centre | Mintenance',
  description:
    'Practical answers for posting jobs, comparing bids, payments and getting support.',
};
const topics = [
  [
    'Getting started',
    'Create your account and find your way around.',
    'account',
  ],
  ['Posting a job', 'Describe the work and compare proposals.', 'post a job'],
  [
    'Choosing a tradesperson',
    'Understand profiles, credentials and reviews.',
    'contractor',
  ],
  ['Payments', 'Understand payment protection and platform fees.', 'payment'],
  ['Reviews and feedback', 'Share your experience after a job.', 'reviews'],
  [
    'Problems with a job',
    'Find out how to contact support about a dispute.',
    'dispute',
  ],
];
export default function Help() {
  return (
    <>
      <LandingNavigation />
      <main id='main-content' className='bg-[#f2f7f3] text-[#1b342b]'>
        <section className='max-w-6xl mx-auto px-6 pt-16 pb-12'>
          <p className='text-sm uppercase tracking-[.18em] font-semibold text-[#347968]'>
            Help centre
          </p>
          <h1 className='mt-5 max-w-3xl font-semibold'>
            A little guidance.
            <br />A clearer next step.
          </h1>
          <p className='mt-6 text-lg max-w-xl text-[#53675d]'>
            Find practical answers for your home, your work, and your account.
          </p>
          <form action='/faq' className='mt-8 flex gap-3 max-w-2xl'>
            <label className='sr-only' htmlFor='help-search'>
              Search help
            </label>
            <input
              id='help-search'
              name='q'
              placeholder='Try payments, bids or verification'
              className='min-w-0 flex-1 rounded-2xl border border-[#cbdcd1] bg-white px-5 py-4'
            />
            <button className='rounded-2xl bg-[#286858] text-white px-6 font-semibold'>
              Search
            </button>
          </form>
        </section>
        <section
          aria-label='Help topics'
          className='max-w-6xl mx-auto px-6 pb-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5'
        >
          {topics.map(([title, description, q]) => (
            <Link
              key={title}
              href={'/faq?q=' + encodeURIComponent(q)}
              className='group rounded-3xl border border-[#d7e4dc] bg-white p-7 transition hover:shadow-lg hover:border-[#6eaa94]'
            >
              <BookOpen className='text-[#347968] mb-7' />
              <h2 className='text-xl font-semibold'>{title}</h2>
              <p className='mt-3 text-[#53675d]'>{description}</p>
              <span className='mt-6 inline-flex gap-2 items-center text-[#286858] font-semibold'>
                Find answers <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </section>
        <section className='max-w-6xl mx-auto px-6 pb-16'>
          <div className='rounded-3xl bg-[#203d32] text-white p-8 sm:p-12 flex flex-wrap items-center justify-between gap-7'>
            <div>
              <MessageCircle className='mb-5' />
              <h2 className='text-3xl font-semibold'>Still need a hand?</h2>
              <p className='mt-3 text-[#d3e6dc]'>
                Tell us what happened and which job or account it relates to.
              </p>
            </div>
            <Link
              href='/contact'
              className='rounded-full bg-white text-[#203d32] px-7 py-4 font-semibold'
            >
              Contact support
            </Link>
          </div>
        </section>
      </main>
      <Footer2025 />
    </>
  );
}
