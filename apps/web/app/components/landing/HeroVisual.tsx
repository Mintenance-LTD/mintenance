'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, PoundSterling } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Free Unsplash photos of actual property maintenance — proven IDs from the codebase's category set.
// BEFORE: plumbing/repair scene (pipe work representing damage to be fixed)
// AFTER: modern restored home exterior (fresh / repaired)
const BEFORE_IMAGE =
  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&q=80&auto=format&fit=crop';
const AFTER_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&auto=format&fit=crop';

/**
 * Authentic product-style hero visual — replaces the stock contractor photo.
 * Shows the property assessment → escrow → bid flow in a glass-morphism card stack.
 * Design language: slate + teal; entrance animations only (no infinite motion).
 */
export function HeroVisual() {
  const prefersReducedMotion = useReducedMotion();

  const fadeIn = (delay = 0) => ({
    initial: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE_SMOOTH, delay },
  });

  return (
    <div className='relative w-full h-[600px] min-h-[520px] flex items-center justify-center'>
      {/* Background accent ring */}
      <div
        aria-hidden='true'
        className='absolute inset-0 flex items-center justify-center pointer-events-none'
      >
        <div className='absolute w-[110%] h-[110%] rounded-full border border-white/5' />
        <div className='absolute w-[85%] h-[85%] rounded-full border border-white/10' />
      </div>

      {/* Primary card: property assessment result */}
      <motion.div
        {...fadeIn(0.05)}
        className='relative z-20 w-full max-w-md rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden'
      >
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-white/5'>
          <div className='flex items-center gap-2'>
            <span className='inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-white/70 uppercase tracking-wider'>
              Assessment
            </span>
          </div>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 text-[11px] font-medium border border-teal-400/20'>
            <span className='w-1.5 h-1.5 rounded-full bg-teal-400' />
            95% confidence
          </span>
        </div>

        {/* Before / After photos */}
        <div className='grid grid-cols-2 gap-3 p-5 pb-4'>
          <div className='relative aspect-[4/3] rounded-xl overflow-hidden border border-white/5'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BEFORE_IMAGE}
              alt='Before — property damage requiring repair'
              className='absolute inset-0 w-full h-full object-cover'
              loading='eager'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' />
            <span className='absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-medium text-white/90 backdrop-blur-sm'>
              BEFORE
            </span>
          </div>
          <div className='relative aspect-[4/3] rounded-xl overflow-hidden border border-teal-400/20'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={AFTER_IMAGE}
              alt='After — property restored by verified contractor'
              className='absolute inset-0 w-full h-full object-cover'
              loading='eager'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-teal-900/40 via-transparent to-transparent' />
            <span className='absolute top-2 left-2 px-2 py-0.5 rounded-md bg-teal-600/80 text-[10px] font-medium text-white backdrop-blur-sm'>
              AFTER
            </span>
          </div>
        </div>

        {/* Detection result */}
        <div className='px-5 pb-5'>
          <div className='rounded-xl bg-white/5 border border-white/5 p-4'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-sm font-semibold text-white'>
                Water ingress &mdash; external wall
              </p>
              <span className='px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[11px] font-medium border border-amber-400/20'>
                Medium
              </span>
            </div>
            <div className='grid grid-cols-2 gap-3 text-[13px]'>
              <div>
                <p className='text-white/40 text-[11px] uppercase tracking-wider mb-1'>
                  Est. repair
                </p>
                <p className='text-white font-semibold tabular-nums'>
                  £180 &ndash; £240
                </p>
              </div>
              <div>
                <p className='text-white/40 text-[11px] uppercase tracking-wider mb-1'>
                  Timeline
                </p>
                <p className='text-white font-semibold'>2 &ndash; 4 hrs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: bid count */}
        <div className='flex items-center justify-between px-5 py-4 border-t border-white/5 bg-white/[0.02]'>
          <div className='flex items-center gap-2'>
            <div className='flex -space-x-1.5'>
              <div className='w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 border border-slate-900' />
              <div className='w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border border-slate-900' />
              <div className='w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 border border-slate-900' />
            </div>
            <p className='text-[13px] text-white/70'>
              <span className='text-white font-semibold'>3 contractors</span>{' '}
              bidding
            </p>
          </div>
          <span className='text-[11px] text-white/40 font-medium'>
            2 min ago
          </span>
        </div>
      </motion.div>

      {/* Floating card: Escrow confirmation */}
      <motion.div
        {...fadeIn(0.3)}
        className='absolute -bottom-2 -left-4 sm:-left-6 lg:left-0 lg:-bottom-4 z-30 w-[220px] rounded-xl bg-white shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] border border-white/80 p-3.5'
      >
        <div className='flex items-start gap-3'>
          <div className='flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center'>
            <ShieldCheck
              className='w-5 h-5 text-emerald-600'
              aria-hidden='true'
            />
          </div>
          <div className='min-w-0'>
            <p className='text-[13px] font-semibold text-slate-900 leading-tight'>
              Payment secured
            </p>
            <p className='text-[11px] text-slate-500 mt-0.5'>
              Held in escrow until you approve
            </p>
          </div>
        </div>
      </motion.div>

      {/* Floating card: Best bid */}
      <motion.div
        {...fadeIn(0.45)}
        className='absolute -top-2 -right-2 sm:-right-4 lg:right-0 lg:-top-4 z-30 w-[200px] rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] p-3.5'
      >
        <div className='flex items-center gap-3'>
          <div className='flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center'>
            <PoundSterling className='w-5 h-5 text-white' aria-hidden='true' />
          </div>
          <div className='min-w-0'>
            <p className='text-[13px] font-semibold text-white leading-tight'>
              Best bid: £195
            </p>
            <p className='text-[11px] text-white/50 mt-0.5'>
              &#9733; 4.9 &middot; DBS verified
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
