'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { AIPreviewDemo } from './ai-preview-demo';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

/**
 * Bento Grid Features Section - showcases platform capabilities
 */
export function BentoFeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Powered by{' '}
            <span className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
              Mint AI
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload a photo of any property problem. Get an instant assessment with repair costs &mdash; no account needed.
          </p>
        </motion.div>

        {/* Bento Grid Layout */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-6 gap-6"
        >
          {/* Large Feature - AI Building Surveyor (2x2 grid space) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-4 md:row-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-3xl opacity-100 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-transparent rounded-3xl" />

            {/* Animated gradient border on hover */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
              />
            </div>

            <div className="relative h-full p-10 flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-bold mb-6 shadow-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  NEW - Mint AI
                </div>

                <h3 className="text-4xl font-bold text-white mb-4">
                  AI Building Surveyor
                </h3>
                <p className="text-xl text-white/90 mb-6 leading-relaxed max-w-xl">
                  Upload property photos and receive instant damage assessment with cost estimates.
                  Mint AI detects 71 damage types automatically with 95%+ accuracy.
                </p>

                <div className="flex flex-wrap gap-3 mb-8">
                  <div className="px-6 py-3 rounded-xl bg-white/20 backdrop-blur-sm text-white text-base font-bold">
                    Mint AI Technology
                  </div>
                </div>
              </div>

              {/* AI Preview Demo */}
              <div className="mt-6">
                <AIPreviewDemo />
              </div>

              <Link
                href="/try-mint-ai"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 rounded-xl font-bold hover:bg-white/90 transition-all group/link mt-6 w-fit focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-600"
              >
                Try AI Assessment
                <svg className="w-5 h-5 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* Medium Feature - Smart Matching */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-pink-100 rounded-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.1),transparent)] rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[240px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Matching</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Browse verified contractors matched to your job. Compare bids, reviews, and portfolios.
                </p>
              </div>
              <Link href="/discover" className="inline-flex items-center text-pink-600 font-semibold hover:text-pink-700 group/link">
                Find contractors
                <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* Medium Feature - Protected Payments */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.1),transparent)] rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[240px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Protected Payments</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Your money stays with us until you approve the work. You are always in control.
                </p>
              </div>
              <Link href="/payments" className="inline-flex items-center text-amber-600 font-semibold hover:text-amber-700 group/link">
                Learn more
                <svg className="w-4 h-4 ml-2 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </motion.div>

          {/* Small Feature - Verified Professionals */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[200px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Verified Pros</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Background-checked contractors
                </p>
              </div>
            </div>
          </motion.div>

          {/* Small Feature - Real-Time Messaging */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[200px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Live Chat</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Instant communication
                </p>
              </div>
            </div>
          </motion.div>

          {/* Small Feature - Project Tracking */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-3xl" />

            <div className="relative h-full p-8 flex flex-col justify-between min-h-[200px] hover:scale-[1.02] transition-transform duration-300">
              <div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Progress Tracking</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Real-time project updates
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
