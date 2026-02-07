'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Sticky floating CTA button that appears after scrolling.
 * Self-contained: manages its own scroll-based visibility state.
 */
export function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Link
            href="/jobs/create"
            className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-full shadow-2xl hover:shadow-teal-500/50 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            aria-label="Post a job now"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Post a Job</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
