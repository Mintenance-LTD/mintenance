'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function ConnectionLine() {
  const prefersReducedMotion = useReducedMotion();

  // Static version for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-8 w-40 h-12 flex items-center justify-center">
        <svg width="160" height="48" viewBox="0 0 160 48" fill="none" className="absolute">
          <path
            d="M0 24 Q40 24, 80 24 Q120 24, 160 24"
            stroke="url(#lineGradientStatic)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <defs>
            <linearGradient id="lineGradientStatic" x1="0" y1="24" x2="160" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#10B981" />
              <stop offset="1" stopColor="#F59E0B" stopOpacity="0.6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Static connection dots */}
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-emerald-400 opacity-70"
            style={{ left: `${10 + i * 20}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-8 w-40 h-12 flex items-center justify-center">
      {/* Main line */}
      <svg width="160" height="48" viewBox="0 0 160 48" fill="none" className="absolute">
        {/* Base glow line */}
        <motion.path
          d="M0 24 Q40 24, 80 24 Q120 24, 160 24"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
        />

        {/* Animated pulse along line */}
        <motion.circle
          r="4"
          fill="#34D399"
          filter="url(#glow)"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            cx: [0, 80, 160, 160],
            cy: [24, 24, 24, 24]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
        />

        {/* Defs */}
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="24" x2="160" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="0.5" stopColor="#10B981" />
            <stop offset="1" stopColor="#F59E0B" stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Connection dots */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-emerald-400"
          style={{ left: `${10 + i * 20}%` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 1, 0.4]
          }}
          transition={{
            delay: 1.2 + i * 0.1,
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}
