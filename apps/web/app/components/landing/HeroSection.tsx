'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Hero categories; values match jobs/create serviceCategories for query-param prefilling */
const HERO_CATEGORIES = [
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Carpentry', value: 'carpentry' },
  { label: 'Painting', value: 'painting' },
  { label: 'Roofing', value: 'roofing' },
  { label: 'Gardening', value: 'gardening' },
  { label: 'Handyman', value: 'handyman' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'HVAC', value: 'hvac' },
] as const;

const POPULAR_JOBS = [
  'Emergency plumber',
  'Boiler service',
  'Roof repair',
  'Electrical fault',
  'Garden tidy',
  'Bathroom fitting',
];

const PROOF_ITEMS = [
  { label: 'Payment held until approval', icon: ShieldCheck },
  { label: 'Profiles show insurance and reviews', icon: BadgeCheck },
  { label: 'Messages, quotes and photos kept together', icon: ClipboardCheck },
];

const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface HeroSectionProps {
  /** Real active contractors count from API; only shown when hasRealStats is true */
  activeContractors?: number | null;
  /** True when stats came from /api/stats/platform (not fallbacks). Badge count shown only then. */
  hasRealStats?: boolean;
  /** True while platform stats are loading */
  statsLoading?: boolean;
}

export function HeroSection({
  activeContractors = null,
  hasRealStats = false,
  statsLoading = false,
}: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const [category, setCategory] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: EASE_SMOOTH,
      },
    },
  };

  const postJobHref = (() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (postcode.trim()) params.set('location', postcode.trim());
    const qs = params.toString();
    return qs ? `/jobs/create?${qs}` : '/jobs/create';
  })();

  return (
    <section className='relative isolate overflow-hidden bg-[#f5f7f3] pt-16 text-slate-950'>
      <div
        aria-hidden='true'
        className='absolute inset-x-0 top-16 h-[34rem] bg-[linear-gradient(180deg,#e6f2eb_0%,#f5f7f3_100%)]'
      />

      <div className='relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl grid-rows-[1fr_auto] px-4 pb-8 pt-10 sm:px-6 lg:px-8'>
        <motion.div
          initial='hidden'
          animate='visible'
          transition={{ staggerChildren: 0.08 }}
          className='grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]'
        >
          <div className='max-w-3xl'>
            <motion.p
              variants={itemVariants}
              className='mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-4 py-2 text-sm font-bold text-emerald-900 shadow-sm'
            >
              <span className='h-2.5 w-2.5 rounded-full bg-emerald-500' />
              {!statsLoading && hasRealStats && activeContractors != null
                ? `${Number(activeContractors).toLocaleString()}+ verified tradespeople online`
                : 'Post free. Compare quotes. Pay when approved.'}
            </motion.p>

            <motion.h1
              variants={itemVariants}
              className='max-w-4xl text-5xl font-bold leading-[0.98] tracking-tight text-slate-950 sm:text-6xl lg:text-[5.75rem]'
            >
              Get the right tradesperson without chasing around.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className='mt-6 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl'
            >
              Tell Mintenance what needs doing. Verified local tradespeople
              respond with bids, and your payment stays protected until the job
              is signed off.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className='mt-7 grid max-w-xl gap-3 sm:grid-cols-3'
            >
              <div>
                <p className='text-3xl font-bold text-slate-950'>3 steps</p>
                <p className='text-sm font-medium text-slate-600'>
                  Post, compare, approve
                </p>
              </div>
              <div>
                <p className='text-3xl font-bold text-slate-950'>24-48h</p>
                <p className='text-sm font-medium text-slate-600'>
                  Typical first bids
                </p>
              </div>
              <div>
                <p className='text-3xl font-bold text-slate-950'>£0</p>
                <p className='text-sm font-medium text-slate-600'>
                  To post a job
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_SMOOTH, delay: 0.1 }}
            className='relative'
          >
            <div className='absolute -left-5 top-8 hidden rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl lg:block'>
              4 bids received
            </div>
            <div className='absolute -right-3 bottom-16 hidden rounded-lg border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-emerald-900 shadow-xl lg:block'>
              Payment protected
            </div>

            <div className='overflow-hidden rounded-xl bg-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] ring-1 ring-slate-200'>
              <div className='grid grid-cols-[1fr_1.1fr]'>
                <div className='relative min-h-[440px] bg-slate-900'>
                  {/* 2026-05-13 landing audit: was a raw <img>, which is
                      the LCP element on the landing page — no
                      optimization, no responsive srcset, no priority
                      hint. Swapped to next/image with `fill` + `priority`
                      so it's preloaded and served at the right size,
                      improving Largest Contentful Paint. */}
                  <Image
                    src='/hero-assets/plumber-repair.jpg'
                    alt='Kitchen tap repair job'
                    fill
                    priority
                    sizes='(max-width: 1024px) 100vw, 45vw'
                    className='object-cover'
                  />
                  <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.72)_100%)]' />
                  <div className='absolute bottom-5 left-5 right-5 rounded-lg bg-white/95 p-4 shadow-lg backdrop-blur'>
                    <div className='mb-2 flex items-center gap-1 text-sm font-bold text-amber-600'>
                      <Star className='h-4 w-4 fill-current' />
                      4.9 rated
                    </div>
                    <p className='text-sm font-bold text-slate-950'>
                      Kitchen plumbing repair
                    </p>
                    <p className='mt-1 text-xs font-medium text-slate-600'>
                      4 verified plumbers nearby
                    </p>
                  </div>
                </div>

                <div className='flex flex-col justify-between p-6'>
                  <div>
                    <p className='text-xs font-bold uppercase tracking-wide text-emerald-700'>
                      Active job
                    </p>
                    <h2 className='mt-2 text-2xl font-bold leading-tight text-slate-950'>
                      Leak under kitchen sink
                    </h2>
                    <p className='mt-3 text-sm leading-6 text-slate-600'>
                      Photos uploaded, postcode added, bids open to verified
                      plumbers nearby.
                    </p>
                  </div>

                  <div className='mt-6 space-y-3'>
                    {[
                      ['Quote range', '£120 - £180'],
                      ['Earliest visit', 'Tomorrow'],
                      ['Payment status', 'Held safely'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className='flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3'
                      >
                        <span className='text-sm font-medium text-slate-600'>
                          {label}
                        </span>
                        <span className='text-sm font-bold text-slate-950'>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className='mt-6 rounded-lg bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-950'>
                    Homeowner approves the work before funds are released.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_SMOOTH, delay: 0.25 }}
          className='mt-10'
        >
          <div className='rounded-xl bg-slate-950 p-3 shadow-[0_28px_70px_rgba(15,23,42,0.24)]'>
            <div className='grid gap-3 lg:grid-cols-[1.15fr_1fr_auto]'>
              <div className='relative'>
                <label
                  htmlFor='hero-category'
                  className='absolute left-4 top-2 text-[11px] font-bold uppercase tracking-wide text-slate-500'
                >
                  What do you need?
                </label>
                <select
                  id='hero-category'
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className='h-16 w-full appearance-none rounded-lg border border-white bg-white px-4 pb-2 pt-7 text-base font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-400'
                  aria-label='Service category'
                >
                  <option value=''>Choose a trade or job type</option>
                  {HERO_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className='pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500'
                  aria-hidden='true'
                />
              </div>

              <div className='relative'>
                <label
                  htmlFor='hero-postcode'
                  className='absolute left-11 top-2 text-[11px] font-bold uppercase tracking-wide text-slate-500'
                >
                  Where?
                </label>
                <MapPin
                  className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500'
                  aria-hidden='true'
                />
                <input
                  id='hero-postcode'
                  type='text'
                  value={postcode}
                  onChange={(event) => setPostcode(event.target.value)}
                  placeholder='Postcode or area'
                  className='h-16 w-full rounded-lg border border-white bg-white pb-2 pl-11 pr-4 pt-7 text-base font-bold text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400'
                  aria-label='Postcode or location'
                />
              </div>

              <Link
                href={postJobHref}
                className='inline-flex h-16 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 text-base font-bold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950'
              >
                <Search className='h-5 w-5' aria-hidden='true' />
                Post Job
              </Link>
            </div>
          </div>

          <div className='mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex flex-wrap gap-2'>
              {POPULAR_JOBS.map((job) => (
                <Link
                  key={job}
                  href={`/jobs/create?description=${encodeURIComponent(job)}`}
                  className='rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800'
                >
                  {job}
                </Link>
              ))}
            </div>
            <div className='grid gap-2 sm:grid-cols-3 lg:min-w-[560px]'>
              {PROOF_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className='flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200'
                  >
                    <Icon
                      className='h-4 w-4 shrink-0 text-emerald-600'
                      aria-hidden='true'
                    />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
