'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const DETECTIONS = [
  { x: 20, y: 15, w: 25, h: 20, label: 'Roof Damage', confidence: 97 },
  { x: 60, y: 30, w: 30, h: 25, label: 'Cracked Wall', confidence: 95 },
  { x: 15, y: 65, w: 20, h: 15, label: 'Window Seal', confidence: 92 },
];

/**
 * AI Preview Demo Component - Interactive damage detection animation
 */
export function AIPreviewDemo() {
  const [stage, setStage] = useState<'idle' | 'detecting' | 'complete'>('idle');
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      const timer1 = setTimeout(() => setStage('detecting'), 500);
      const timer2 = setTimeout(() => setStage('complete'), 2500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isInView]);

  return (
    <div ref={ref} className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden">
      {/* Sample property image placeholder */}
      <div className="absolute inset-0 flex items-center justify-center text-slate-400">
        <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>

      {/* Scanning overlay */}
      {stage === 'detecting' && (
        <motion.div
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, ease: 'linear' }}
          className="absolute left-0 right-0 h-1 bg-teal-500 shadow-lg shadow-teal-500/50"
        />
      )}

      {/* Bounding boxes */}
      {stage === 'complete' && DETECTIONS.map((detection, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.2, duration: 0.3 }}
          className="absolute border-2 border-teal-500"
          style={{
            left: `${detection.x}%`,
            top: `${detection.y}%`,
            width: `${detection.w}%`,
            height: `${detection.h}%`,
          }}
        >
          <div className="absolute -top-8 left-0 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {detection.label} ({detection.confidence}%)
          </div>
        </motion.div>
      ))}

      {/* Status indicator */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
          {stage === 'idle' && <span className="text-slate-600">Ready to analyze</span>}
          {stage === 'detecting' && (
            <span className="flex items-center gap-2 text-teal-600">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block"
              >
                ⚡
              </motion.span>
              Detecting...
            </span>
          )}
          {stage === 'complete' && (
            <span className="text-teal-600">
              ✓ 71 damage types found
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
