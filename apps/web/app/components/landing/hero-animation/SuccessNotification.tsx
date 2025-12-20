'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function SuccessNotification() {
  const prefersReducedMotion = useReducedMotion();

  // Static version for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl px-4 py-3 shadow-2xl shadow-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <div className="text-white font-semibold text-xs">Job complete</div>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <svg
                    key={i}
                    className="w-3 h-3 text-amber-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.5, type: "spring", stiffness: 100 }}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-30"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl px-4 py-3 shadow-2xl shadow-emerald-500/10"
      >
        <div className="flex items-center gap-3">
          {/* Checkmark icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
            className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <motion.svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1.6, duration: 0.4 }}
              />
            </motion.svg>
          </motion.div>

          <div>
            <div className="text-white font-semibold text-xs">Job complete</div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.svg
                  key={i}
                  className="w-3 h-3 text-amber-400 fill-current"
                  viewBox="0 0 20 20"
                  initial={{ opacity: 0, scale: 0, rotate: -30 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 1.8 + i * 0.08, type: "spring", stiffness: 200 }}
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </motion.svg>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
