'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

// Empty State
export const EmptyState = ({ filter }: { filter: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className='bg-white rounded-xl border border-gray-200 p-16 text-center'
  >
    <div className='w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-6'>
      <FileText className='w-10 h-10 text-gray-400' />
    </div>
    <h3 className='text-xl font-semibold text-gray-900 mb-2'>
      {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
    </h3>
    <p className='text-gray-600 mb-8 max-w-md mx-auto'>
      {filter === 'all'
        ? 'Create invoices in the Mintenance mobile app. Your invoices appear here so you can track, send and manage them on the web.'
        : `You don't have any ${filter} invoices at the moment.`}
    </p>
  </motion.div>
);
