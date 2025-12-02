'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function HomeownerCharacter() {
  const prefersReducedMotion = useReducedMotion();

  // Static SVG content for reduced motion
  const StaticSVG = () => (
    <svg width="120" height="180" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="175" rx="35" ry="5" fill="black" fillOpacity="0.15" />
      <g>
        <rect x="40" y="130" width="14" height="40" rx="7" fill="#1E3A5F" />
        <rect x="66" y="130" width="14" height="40" rx="7" fill="#1E3A5F" />
        <ellipse cx="47" cy="168" rx="10" ry="6" fill="#374151" />
        <ellipse cx="73" cy="168" rx="10" ry="6" fill="#374151" />
      </g>
      <path d="M30 85 C30 70, 45 60, 60 60 C75 60, 90 70, 90 85 L90 130 C90 135, 85 140, 80 140 L40 140 C35 140, 30 135, 30 130 Z" fill="url(#shirtGradientStatic)" />
      <path d="M50 62 L60 75 L70 62" stroke="#1E88E5" strokeWidth="3" fill="none" />
      <path d="M30 85 C20 90, 15 100, 18 115 C20 125, 25 130, 30 128" stroke="url(#armGradientStatic)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="125" r="8" fill="#E8B89D" />
      <path d="M90 85 C100 80, 110 70, 105 55" stroke="url(#armGradientStatic)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <circle cx="105" cy="50" r="8" fill="#E8B89D" />
      <rect x="52" y="50" width="16" height="15" rx="4" fill="#E8B89D" />
      <circle cx="60" cy="35" r="28" fill="#E8B89D" />
      <path d="M32 30 C32 12, 45 5, 60 5 C75 5, 88 12, 88 30 C88 35, 85 38, 80 38 C75 38, 75 30, 60 30 C45 30, 45 38, 40 38 C35 38, 32 35, 32 30Z" fill="#4A3728" />
      <path d="M45 12 C50 8, 70 8, 75 12" stroke="#3D2E21" strokeWidth="3" fill="none" />
      <ellipse cx="32" cy="38" rx="5" ry="7" fill="#E8B89D" />
      <ellipse cx="88" cy="38" rx="5" ry="7" fill="#E8B89D" />
      <path d="M42 26 C45 24, 50 24, 52 26" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M68 26 C70 24, 75 24, 78 26" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="47" cy="35" rx="6" ry="6" fill="white" />
      <ellipse cx="73" cy="35" rx="6" ry="6" fill="white" />
      <circle cx="48" cy="36" r="4" fill="#2D3748" />
      <circle cx="74" cy="36" r="4" fill="#2D3748" />
      <circle cx="49" cy="34" r="1.5" fill="white" />
      <circle cx="75" cy="34" r="1.5" fill="white" />
      <ellipse cx="60" cy="42" rx="3" ry="2" fill="#D4A088" />
      <path d="M52 50 C55 55, 65 55, 68 50" stroke="#C4846C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="38" cy="44" rx="5" ry="3" fill="#F5B5A8" fillOpacity="0.5" />
      <ellipse cx="82" cy="44" rx="5" ry="3" fill="#F5B5A8" fillOpacity="0.5" />
      <defs>
        <linearGradient id="shirtGradientStatic" x1="60" y1="60" x2="60" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#42A5F5" />
          <stop offset="1" stopColor="#1E88E5" />
        </linearGradient>
        <linearGradient id="armGradientStatic" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#42A5F5" />
          <stop offset="1" stopColor="#1E88E5" />
        </linearGradient>
      </defs>
    </svg>
  );

  // Static version for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="absolute -inset-6 rounded-full bg-blue-500/15 blur-2xl opacity-40" />
        <div className="relative">
          <StaticSVG />
        </div>
        <div className="mt-4 px-5 py-2.5 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700/50">
          <span className="text-sm font-semibold text-blue-300">Homeowner</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      className="relative flex flex-col items-center"
    >
      {/* Character glow */}
      <motion.div
        className="absolute -inset-6 rounded-full bg-blue-500/15 blur-2xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating animation wrapper */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <svg width="120" height="180" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="60" cy="175" rx="35" ry="5" fill="black" fillOpacity="0.15" />

          {/* Legs */}
          <motion.g
            animate={{ rotate: [-1, 1, -1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0.5, originY: 0 }}
          >
            <rect x="40" y="130" width="14" height="40" rx="7" fill="#1E3A5F" />
            <rect x="66" y="130" width="14" height="40" rx="7" fill="#1E3A5F" />
            {/* Shoes */}
            <ellipse cx="47" cy="168" rx="10" ry="6" fill="#374151" />
            <ellipse cx="73" cy="168" rx="10" ry="6" fill="#374151" />
          </motion.g>

          {/* Body / Shirt */}
          <path
            d="M30 85 C30 70, 45 60, 60 60 C75 60, 90 70, 90 85 L90 130 C90 135, 85 140, 80 140 L40 140 C35 140, 30 135, 30 130 Z"
            fill="url(#shirtGradient)"
          />
          {/* Shirt collar */}
          <path d="M50 62 L60 75 L70 62" stroke="#1E88E5" strokeWidth="3" fill="none" />

          {/* Arms */}
          <motion.g
            animate={{ rotate: [0, 5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0.2, originY: 0.2 }}
          >
            {/* Left arm */}
            <path
              d="M30 85 C20 90, 15 100, 18 115 C20 125, 25 130, 30 128"
              stroke="url(#armGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left hand */}
            <circle cx="22" cy="125" r="8" fill="#E8B89D" />
          </motion.g>

          <motion.g
            animate={{ rotate: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            style={{ originX: 0.8, originY: 0.2 }}
          >
            {/* Right arm - waving */}
            <path
              d="M90 85 C100 80, 110 70, 105 55"
              stroke="url(#armGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right hand - waving */}
            <circle cx="105" cy="50" r="8" fill="#E8B89D" />
          </motion.g>

          {/* Neck */}
          <rect x="52" y="50" width="16" height="15" rx="4" fill="#E8B89D" />

          {/* Head */}
          <circle cx="60" cy="35" r="28" fill="#E8B89D" />

          {/* Hair */}
          <path
            d="M32 30 C32 12, 45 5, 60 5 C75 5, 88 12, 88 30 C88 35, 85 38, 80 38 C75 38, 75 30, 60 30 C45 30, 45 38, 40 38 C35 38, 32 35, 32 30Z"
            fill="#4A3728"
          />
          {/* Hair detail */}
          <path d="M45 12 C50 8, 70 8, 75 12" stroke="#3D2E21" strokeWidth="3" fill="none" />

          {/* Ears */}
          <ellipse cx="32" cy="38" rx="5" ry="7" fill="#E8B89D" />
          <ellipse cx="88" cy="38" rx="5" ry="7" fill="#E8B89D" />

          {/* Face */}
          {/* Eyebrows */}
          <motion.g
            animate={{ y: [0, -1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M42 26 C45 24, 50 24, 52 26" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M68 26 C70 24, 75 24, 78 26" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" fill="none" />
          </motion.g>

          {/* Eyes */}
          <g>
            <ellipse cx="47" cy="35" rx="6" ry="6" fill="white" />
            <ellipse cx="73" cy="35" rx="6" ry="6" fill="white" />
            <motion.g
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, times: [0, 0.5, 1] }}
            >
              <circle cx="48" cy="36" r="4" fill="#2D3748" />
              <circle cx="74" cy="36" r="4" fill="#2D3748" />
              {/* Eye highlights */}
              <circle cx="49" cy="34" r="1.5" fill="white" />
              <circle cx="75" cy="34" r="1.5" fill="white" />
            </motion.g>
          </g>

          {/* Nose */}
          <ellipse cx="60" cy="42" rx="3" ry="2" fill="#D4A088" />

          {/* Mouth - smile */}
          <motion.path
            d="M52 50 C55 55, 65 55, 68 50"
            stroke="#C4846C"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            animate={{ d: ["M52 50 C55 55, 65 55, 68 50", "M52 50 C55 56, 65 56, 68 50", "M52 50 C55 55, 65 55, 68 50"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Cheek blush */}
          <ellipse cx="38" cy="44" rx="5" ry="3" fill="#F5B5A8" fillOpacity="0.5" />
          <ellipse cx="82" cy="44" rx="5" ry="3" fill="#F5B5A8" fillOpacity="0.5" />

          {/* Gradients */}
          <defs>
            <linearGradient id="shirtGradient" x1="60" y1="60" x2="60" y2="140" gradientUnits="userSpaceOnUse">
              <stop stopColor="#42A5F5" />
              <stop offset="1" stopColor="#1E88E5" />
            </linearGradient>
            <linearGradient id="armGradient" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#42A5F5" />
              <stop offset="1" stopColor="#1E88E5" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-4 px-5 py-2.5 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700/50"
      >
        <span className="text-sm font-semibold text-blue-300">Homeowner</span>
      </motion.div>
    </motion.div>
  );
}
