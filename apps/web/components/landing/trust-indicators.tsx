'use client';

import React from 'react';
import { motion } from 'framer-motion';

const TRUST_BADGES = [
  {
    title: '256-bit SSL',
    subtitle: 'Encrypted',
    color: 'text-teal-600',
    delay: 0.1,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    ),
  },
  {
    title: 'Payment',
    subtitle: 'Protected',
    color: 'text-green-600',
    delay: 0.2,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
  {
    title: 'GDPR',
    subtitle: 'Compliant',
    color: 'text-blue-600',
    delay: 0.3,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
  {
    title: 'All Contractors',
    subtitle: 'Verified',
    color: 'text-amber-600',
    delay: 0.4,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
];

/**
 * Trust and security indicators section
 */
export function TrustIndicators() {
  return (
    <section className="py-16 bg-gray-50 border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Trusted & Secure</h3>
          <p className="text-gray-600">Your data and payments are protected by industry-leading security</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
          {TRUST_BADGES.map((badge) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: badge.delay }}
              className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 w-full hover:shadow-md transition-shadow"
            >
              <svg className={`w-12 h-12 ${badge.color} mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {badge.icon}
              </svg>
              <h4 className="font-bold text-gray-900 text-sm mb-1">{badge.title}</h4>
              <p className="text-xs text-gray-600">{badge.subtitle}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
