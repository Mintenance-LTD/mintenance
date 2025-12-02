'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function ContractorPhone() {
  const prefersReducedMotion = useReducedMotion();

  // Static version for reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-20"
        style={{ transform: 'translateY(-50%) rotateY(-5deg)' }}
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
              <div className="px-2 py-2 border-b border-slate-700/50 flex items-center justify-between">
                <div className="text-[9px] font-bold text-white">New Jobs</div>
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-white">3</span>
                </div>
              </div>

              {/* Job card - incoming */}
              <div className="m-2 bg-gradient-to-r from-emerald-500/10 to-slate-700/50 rounded-lg p-2 border border-emerald-500/30">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] text-blue-400">JD</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-semibold text-white">New Request</span>
                      <span className="text-[6px] bg-emerald-500 text-white px-1 rounded">NEW</span>
                    </div>
                    <div className="text-[7px] text-slate-400 truncate">Electrical • Kitchen</div>
                    <div className="text-[7px] text-emerald-400 mt-0.5">0.8 miles away</div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-1 mt-2">
                  <div className="flex-1 bg-emerald-500 rounded py-1 text-center">
                    <span className="text-[7px] font-semibold text-white">Quote</span>
                  </div>
                  <div className="flex-1 bg-slate-600 rounded py-1 text-center">
                    <span className="text-[7px] font-semibold text-slate-300">View</span>
                  </div>
                </div>
              </div>

              {/* Previous jobs list */}
              <div className="px-2 space-y-1.5">
                <div className="bg-slate-700/30 rounded-lg p-1.5 flex items-center gap-2 opacity-60">
                  <div className="w-5 h-5 rounded-full bg-slate-600" />
                  <div className="flex-1">
                    <div className="text-[7px] text-slate-400">Plumbing job</div>
                    <div className="text-[6px] text-slate-500">Quote sent</div>
                  </div>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-1.5 flex items-center gap-2 opacity-40">
                  <div className="w-5 h-5 rounded-full bg-slate-600" />
                  <div className="flex-1">
                    <div className="text-[7px] text-slate-400">Painting job</div>
                    <div className="text-[6px] text-emerald-400">Accepted</div>
                  </div>
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
      initial={{ opacity: 0, x: 30, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: -5 }}
      transition={{ delay: 1.0, duration: 0.6, type: "spring" }}
      className="absolute -right-4 top-1/2 -translate-y-1/2 z-20"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
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
            <div className="px-2 py-2 border-b border-slate-700/50 flex items-center justify-between">
              <div className="text-[9px] font-bold text-white">New Jobs</div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <span className="text-[7px] font-bold text-white">3</span>
              </motion.div>
            </div>

            {/* Job card - incoming */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 2.5, duration: 0.4 }}
              className="m-2 bg-gradient-to-r from-emerald-500/10 to-slate-700/50 rounded-lg p-2 border border-emerald-500/30"
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[8px] text-blue-400">JD</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-semibold text-white">New Request</span>
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-[6px] bg-emerald-500 text-white px-1 rounded"
                    >
                      NEW
                    </motion.span>
                  </div>
                  <div className="text-[7px] text-slate-400 truncate">Electrical • Kitchen</div>
                  <div className="text-[7px] text-emerald-400 mt-0.5">0.8 miles away</div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-1 mt-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex-1 bg-emerald-500 rounded py-1 text-center"
                >
                  <span className="text-[7px] font-semibold text-white">Quote</span>
                </motion.div>
                <div className="flex-1 bg-slate-600 rounded py-1 text-center">
                  <span className="text-[7px] font-semibold text-slate-300">View</span>
                </div>
              </div>
            </motion.div>

            {/* Previous jobs list */}
            <div className="px-2 space-y-1.5">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 1.5 }}
                className="bg-slate-700/30 rounded-lg p-1.5 flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-slate-600" />
                <div className="flex-1">
                  <div className="text-[7px] text-slate-400">Plumbing job</div>
                  <div className="text-[6px] text-slate-500">Quote sent</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1.7 }}
                className="bg-slate-700/30 rounded-lg p-1.5 flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-full bg-slate-600" />
                <div className="flex-1">
                  <div className="text-[7px] text-slate-400">Painting job</div>
                  <div className="text-[6px] text-emerald-400">Accepted</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Phone notch/dynamic island */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-full" />
      </motion.div>
    </motion.div>
  );
}
