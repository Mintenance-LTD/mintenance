'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Check, Copy, Share2, Users, Trophy } from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/utils/clipboard';

export function WaitlistSuccessCard({
  position,
  referralCode,
}: {
  position: number;
  referralCode: string;
}) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/coming-soon?ref=${referralCode}`;

  const copyLink = async () => {
    const ok = await safeCopyToClipboard(referralLink);
    if (ok) {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy. Please copy the link manually.');
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Mintenance Early Access',
          text: "I'm on the Mintenance waitlist! Join me and get early access to a better way to find trusted contractors.",
          url: referralLink,
        });
      } catch {
        // User cancelled share
      }
    } else {
      copyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className='mx-auto max-w-2xl rounded-3xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-8 shadow-lg sm:p-12'
    >
      {/* Position badge */}
      <div className='text-center'>
        <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100'>
          <Trophy className='h-10 w-10 text-teal-600' />
        </div>
        <h2 className='text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl'>
          You&apos;re on the list!
        </h2>
        <div className='mt-4 inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-3'>
          <span className='text-sm text-navy-300'>Your position:</span>
          <span className='text-2xl font-bold text-white'>#{position}</span>
        </div>
      </div>

      {/* Referral section */}
      <div className='mt-8 rounded-2xl border border-teal-100 bg-white p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600'>
            <Users className='h-5 w-5' />
          </div>
          <div>
            <h3 className='text-base font-semibold text-navy-900'>
              Move up the waitlist
            </h3>
            <p className='text-sm text-navy-500'>
              Each friend who signs up moves you closer to the front
            </p>
          </div>
        </div>

        <div className='flex gap-2'>
          <div className='flex-1 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3'>
            <p className='truncate text-sm text-navy-600'>{referralLink}</p>
          </div>
          <button
            type='button'
            onClick={copyLink}
            className='flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50'
          >
            {copied ? (
              <Check className='h-4 w-4 text-teal-500' />
            ) : (
              <Copy className='h-4 w-4' />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <button
          type='button'
          onClick={shareNative}
          className='mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/30'
        >
          <Share2 className='h-4 w-4' />
          Share with Friends
        </button>
      </div>

      <p className='mt-6 text-center text-sm text-navy-400'>
        We&apos;ll email you when Mintenance launches. Keep an eye on your
        inbox!
      </p>
    </motion.div>
  );
}
