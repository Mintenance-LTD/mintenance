'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Exit intent modal - shows a promotional overlay when user moves to leave the page.
 * Self-contained: manages its own visibility state and mouse-leave detection.
 */
export function ExitIntentModal() {
  const [showExitIntent, setShowExitIntent] = useState(false);

  useEffect(() => {
    let hasShown = false;
    const handleMouseLeave = (e: MouseEvent) => {
      if (!hasShown && e.clientY <= 10 && window.scrollY > 500) {
        setShowExitIntent(true);
        hasShown = true;
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  return (
    <AnimatePresence>
      {showExitIntent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowExitIntent(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowExitIntent(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-lg p-2"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full mb-6 shadow-lg"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </motion.div>

              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Wait! Before You Go...
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">
                Get your first AI damage assessment <strong className="text-teal-600">FREE</strong>.
                See what our Mint AI can do for your property in just 60 seconds.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/try-mint-ai"
                  className="px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-lg font-bold rounded-xl hover:shadow-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                  onClick={() => setShowExitIntent(false)}
                >
                  Try AI Assessment Free
                </Link>
                <button
                  onClick={() => setShowExitIntent(false)}
                  className="px-8 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                  No Thanks
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-6">
                ✓ No credit card required &nbsp;&nbsp; ✓ Instant results &nbsp;&nbsp; ✓ 100% free
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
