'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  ClipboardList,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45 },
  },
};

const FEATURES = [
  {
    title: 'Verified tradespeople',
    description:
      'Profiles show insurance, credentials, ratings, and previous work before you choose who to hire.',
    icon: BadgeCheck,
  },
  {
    title: 'Clear job records',
    description:
      'Photos, messages, quotes, and approvals stay attached to the job so everyone knows what was agreed.',
    icon: ClipboardList,
  },
  {
    title: 'Protected payments',
    description:
      'Funds are held securely and released after the work is complete and approved.',
    icon: ShieldCheck,
  },
  {
    title: 'Quote comparison',
    description:
      'Compare bids by price, availability, rating, and contractor details without cold calling around.',
    icon: WalletCards,
  },
  {
    title: 'Direct communication',
    description:
      'Keep questions, updates, appointment notes, and evidence in one shared conversation.',
    icon: MessageSquareText,
  },
  {
    title: 'Optional photo guidance',
    description:
      'Use photo assistance when it helps describe a problem. Final quotes still come from verified tradespeople.',
    icon: Sparkles,
  },
];

export function BentoFeaturesSection() {
  return (
    <section className='py-24 bg-white overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className='max-w-3xl mb-14'
        >
          <p className='text-sm font-semibold uppercase tracking-wider text-teal-700 mb-3'>
            Built for trust
          </p>
          <h2 className='text-4xl sm:text-5xl font-bold text-gray-900 mb-5'>
            Everything a property repair needs in one place
          </h2>
          <p className='text-lg text-gray-600 leading-relaxed'>
            Mintenance is designed around the parts of home maintenance that
            usually create stress: finding the right person, agreeing the work,
            protecting the money, and keeping proof of what happened.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, amount: 0.1 }}
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
        >
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const isLead = index === 0;

            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className={`rounded-lg border p-6 shadow-sm ${
                  isLead
                    ? 'bg-slate-950 border-slate-900 text-white md:col-span-2 lg:col-span-1'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <div
                  className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg ${
                    isLead
                      ? 'bg-teal-400 text-slate-950'
                      : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  <Icon className='h-5 w-5' aria-hidden='true' />
                </div>
                <h3
                  className={`text-xl font-bold mb-3 ${
                    isLead ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {feature.title}
                </h3>
                <p
                  className={`leading-relaxed ${
                    isLead ? 'text-slate-300' : 'text-gray-600'
                  }`}
                >
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className='mt-12 flex flex-col sm:flex-row gap-4'>
          <Link
            href='/jobs/create'
            className='inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2'
          >
            Post a Job
          </Link>
          <Link
            href='/try-mint-ai'
            className='inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2'
          >
            Try photo guidance
          </Link>
        </div>
      </div>
    </section>
  );
}
