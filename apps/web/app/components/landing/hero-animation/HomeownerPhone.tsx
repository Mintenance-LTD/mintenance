'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function HomeownerPhone() {
  const prefersReducedMotion = useReducedMotion();

  // Static version for reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-20"
        style={{ transform: 'translateY(-50%) rotateY(5deg)' }}
      >
        <div className="relative">
          {/* Phone frame */}
          <div className="w-32 h-56 bg-slate-900 rounded-[20px] p-1.5 shadow-2xl shadow-black/50 border border-slate-700/50">
            {/* Screen */}
            <div className="w-full h-full bg-slate-800 rounded-[16px] overflow-hidden relative">
              {/* Status bar */}
              <div className="h-5 bg-slate-900/80 flex items-center justify-between px-3">
                <span className="text-[8px] text-slate-400">9:41</span>
                <div className="flex gap-1">
                  <div className="w-2.5 h-1.5 bg-slate-400 rounded-sm" />
                  <div className="w-1 h-1.5 bg-emerald-400 rounded-sm" />
                </div>
              </div>

              {/* App header */}
              <div className="px-2 py-2 border-b border-slate-700/50">
                <div className="text-[9px] font-bold text-white">Post a Job</div>
              </div>

              {/* Content */}
              <div className="p-2 space-y-2">
                {/* Job type selector */}
                <div className="bg-slate-700/50 rounded-lg p-2">
                  <div className="text-[7px] text-slate-400 mb-1">Service type</div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-[8px] text-white font-medium">Electrical</span>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-700/50 rounded-lg p-2">
                  <div className="text-[7px] text-slate-400 mb-1">Description</div>
                  <div className="text-[8px] text-slate-300 leading-tight">Fix broken light switch in kitchen...</div>
                </div>

                {/* Photo upload */}
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center border border-dashed border-slate-600">
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="w-8 h-8 rounded bg-slate-700 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-amber-600/40 to-slate-600" />
                  </div>
                </div>

                {/* Submit button */}
                <div className="bg-emerald-500 rounded-lg py-1.5 text-center mt-2">
                  <span className="text-[8px] font-semibold text-white">Get Quotes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Phone notch/dynamic island */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -30, rotateY: 15 }}
      animate={{ opacity: 1, x: 0, rotateY: 5 }}
      transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
      className="absolute -left-4 top-1/2 -translate-y-1/2 z-20"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="relative"
      >
        {/* Phone frame */}
        <div className="w-32 h-56 bg-slate-900 rounded-[20px] p-1.5 shadow-2xl shadow-black/50 border border-slate-700/50">
          {/* Screen */}
          <div className="w-full h-full bg-slate-800 rounded-[16px] overflow-hidden relative">
            {/* Status bar */}
            <div className="h-5 bg-slate-900/80 flex items-center justify-between px-3">
              <span className="text-[8px] text-slate-400">9:41</span>
              <div className="flex gap-1">
                <div className="w-2.5 h-1.5 bg-slate-400 rounded-sm" />
                <div className="w-1 h-1.5 bg-emerald-400 rounded-sm" />
              </div>
            </div>

            {/* App header */}
            <div className="px-2 py-2 border-b border-slate-700/50">
              <div className="text-[9px] font-bold text-white">Post a Job</div>
            </div>

            {/* Content */}
            <div className="p-2 space-y-2">
              {/* Job type selector */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="bg-slate-700/50 rounded-lg p-2"
              >
                <div className="text-[7px] text-slate-400 mb-1">Service type</div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-[8px] text-white font-medium">Electrical</span>
                </div>
              </motion.div>

              {/* Description */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="bg-slate-700/50 rounded-lg p-2"
              >
                <div className="text-[7px] text-slate-400 mb-1">Description</div>
                <div className="text-[8px] text-slate-300 leading-tight">Fix broken light switch in kitchen...</div>
              </motion.div>

              {/* Photo upload */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.6 }}
                className="flex gap-1"
              >
                <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center border border-dashed border-slate-600">
                  <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="w-8 h-8 rounded bg-slate-700 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-amber-600/40 to-slate-600" />
                </div>
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                whileHover={{ scale: 1.02 }}
                className="bg-emerald-500 rounded-lg py-1.5 text-center mt-2"
              >
                <span className="text-[8px] font-semibold text-white">Get Quotes</span>
              </motion.div>
            </div>

            {/* Sending indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
              transition={{ delay: 2.2, duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500/90 rounded-full px-2 py-0.5 flex items-center gap-1"
            >
              <svg className="w-2 h-2 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-[7px] text-white font-medium">Sending...</span>
            </motion.div>
          </div>
        </div>

        {/* Phone notch/dynamic island */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-full" />
      </motion.div>
    </motion.div>
  );
}
