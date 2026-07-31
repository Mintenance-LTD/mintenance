'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  PoundSterling,
  TrendingUp,
} from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

interface StatsGridProps {
  stats: {
    total: number;
    pending: number;
    pendingAmount: number;
    acceptanceRate: number;
    acceptedAmount: number;
  };
}

export function QuotesStatsGrid({ stats }: StatsGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial='hidden'
      animate='visible'
      className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
    >
      <motion.div
        variants={fadeInUp}
        className='bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200'
      >
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-slate-600 mb-1'>
              Total Quotes
            </p>
            <p className='text-3xl font-semibold text-slate-900'>
              {stats.total}
            </p>
          </div>
          <div className='w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center'>
            <FileText className='w-6 h-6 text-slate-600' />
          </div>
        </div>
        <div className='mt-4 flex items-center gap-2 text-xs'>
          <span className='flex items-center gap-1 text-teal-600 font-medium'>
            <TrendingUp className='w-3 h-3' />
            12% vs last month
          </span>
        </div>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className='bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200'
      >
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-slate-600 mb-1'>
              Pending Amount
            </p>
            <p className='text-3xl font-semibold text-amber-600'>
              £{stats.pendingAmount.toLocaleString()}
            </p>
          </div>
          <div className='w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center'>
            <Clock className='w-6 h-6 text-amber-600' />
          </div>
        </div>
        <div className='mt-4 flex items-center gap-2 text-xs'>
          <span className='text-slate-600'>
            {stats.pending} quotes awaiting response
          </span>
        </div>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className='bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200'
      >
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-slate-600 mb-1'>
              Acceptance Rate
            </p>
            <p className='text-3xl font-semibold text-teal-600'>
              {stats.acceptanceRate.toFixed(0)}%
            </p>
          </div>
          <div className='w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center'>
            <CheckCircle className='w-6 h-6 text-teal-600' />
          </div>
        </div>
        <div className='mt-4 flex items-center gap-2 text-xs'>
          <span className='flex items-center gap-1 text-teal-600 font-medium'>
            <TrendingUp className='w-3 h-3' />
            Above average
          </span>
        </div>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        className='bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-200'
      >
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-slate-600 mb-1'>
              Accepted Revenue
            </p>
            <p className='text-3xl font-semibold text-green-600'>
              £{stats.acceptedAmount.toLocaleString()}
            </p>
          </div>
          <div className='w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center'>
            <PoundSterling className='w-6 h-6 text-green-600' />
          </div>
        </div>
        <div className='mt-4 flex items-center gap-2 text-xs'>
          <span className='flex items-center gap-1 text-green-600 font-medium'>
            <TrendingUp className='w-3 h-3' />
            18% growth
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
