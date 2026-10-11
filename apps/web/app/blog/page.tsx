import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { guides } from './guides';
import { LandingNavigation } from '../components/landing/LandingNavigation';
import { Footer2025 } from '../components/landing/Footer2025';
export const metadata = {
  title: 'Home maintenance guides | Mintenance',
  description:
    'Practical guidance for planning jobs, comparing bids and reviewing completed work.',
};
export default function Blog() {
  return (
    <>
      <LandingNavigation />
      <main
        id='main-content'
        className='bg-[#f2f7f3] text-[#1b342b] px-6 py-16'
      >
        <div className='max-w-6xl mx-auto'>
          <p className='text-sm font-semibold tracking-[.18em] uppercase text-[#347968]'>
            The Mintenance guide
          </p>
          <h1 className='max-w-3xl mt-5 font-semibold'>
            Good homes start with
            <br />
            informed decisions.
          </h1>
          <p className='mt-6 mb-12 max-w-xl text-lg text-[#53675d]'>
            Practical reading for the moments before, during, and after a job.
          </p>
          <div className='grid md:grid-cols-2 gap-6'>
            {guides.map((g, i) => (
              <Link
                key={g.slug}
                href={'/blog/' + g.slug}
                className='group rounded-3xl bg-white border border-[#d7e4dc] p-8 sm:p-10 hover:shadow-lg transition'
              >
                <div className='flex justify-between items-center mb-12'>
                  <span className='text-sm font-semibold text-[#347968]'>
                    {g.category}
                  </span>
                  <span aria-hidden='true' className='text-4xl text-[#547464]'>
                    0{i + 1}
                  </span>
                </div>
                <h2 className='text-3xl font-semibold leading-tight'>
                  {g.title}
                </h2>
                <p className='mt-4 text-[#53675d]'>{g.summary}</p>
                <span className='inline-flex gap-2 items-center mt-8 font-semibold text-[#286858]'>
                  Read guide <ArrowUpRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer2025 />
    </>
  );
}
