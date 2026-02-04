'use client';

import React from 'react';
import Link from 'next/link';
import { MotionDiv, MotionButton } from '@/components/ui/MotionDiv';
import { Rocket, MessageCircle } from 'lucide-react';

/**
 * Call-to-action section for Resources page
 * Gradient background with two CTAs
 */
export function ResourcesCTA() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16">
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="relative bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 rounded-3xl p-12 text-center text-white overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Content */}
        <div className="relative z-10">
          <Rocket className="w-16 h-16 mx-auto mb-6 text-teal-200" aria-hidden="true" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Grow Your Business?
          </h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Join thousands of successful contractors who are building thriving businesses on Mintenance
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-teal-600 hover:bg-gray-50 hover:shadow-2xl font-semibold rounded-xl transition-all duration-200"
            >
              <Link href="/contractor/subscription" className="flex items-center justify-center gap-2">
                <Rocket className="w-5 h-5" aria-hidden="true" />
                Upgrade Your Plan
              </Link>
            </MotionButton>

            <MotionButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-teal-700 hover:bg-teal-800 border-2 border-white/30 text-white font-semibold rounded-xl transition-all duration-200"
            >
              <Link href="/help" className="flex items-center justify-center gap-2">
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                Contact Support
              </Link>
            </MotionButton>
          </div>

          {/* Additional info */}
          <p className="text-sm text-teal-200 mt-8">
            Need help? Our support team is available 24/7 to answer your questions
          </p>
        </div>
      </MotionDiv>
    </section>
  );
}
