'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function ContractorCharacter() {
  const prefersReducedMotion = useReducedMotion();

  // Static SVG content for reduced motion
  const StaticSVG = () => (
    <svg width="120" height="180" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="175" rx="35" ry="5" fill="black" fillOpacity="0.15" />
      <g>
        <rect x="40" y="130" width="14" height="40" rx="7" fill="#5D4E37" />
        <rect x="66" y="130" width="14" height="40" rx="7" fill="#5D4E37" />
        <path d="M35 165 C35 160, 40 158, 47 158 C54 158, 59 160, 59 165 L59 172 C59 175, 54 177, 47 177 C40 177, 35 175, 35 172 Z" fill="#4A4035" />
        <path d="M61 165 C61 160, 66 158, 73 158 C80 158, 85 160, 85 165 L85 172 C85 175, 80 177, 73 177 C66 177, 61 175, 61 172 Z" fill="#4A4035" />
        <rect x="35" y="173" width="24" height="4" rx="2" fill="#2D2520" />
        <rect x="61" y="173" width="24" height="4" rx="2" fill="#2D2520" />
      </g>
      <path d="M28 82 C28 68, 42 58, 60 58 C78 58, 92 68, 92 82 L92 130 C92 136, 86 142, 78 142 L42 142 C34 142, 28 136, 28 130 Z" fill="url(#overallsGradientStatic)" />
      <rect x="38" y="58" width="8" height="35" rx="2" fill="#D97706" />
      <rect x="74" y="58" width="8" height="35" rx="2" fill="#D97706" />
      <circle cx="42" cy="95" r="3" fill="#92400E" />
      <circle cx="78" cy="95" r="3" fill="#92400E" />
      <rect x="48" y="105" width="24" height="20" rx="3" fill="#B45309" stroke="#92400E" strokeWidth="1" />
      <rect x="52" y="100" width="4" height="12" rx="1" fill="#64748B" />
      <rect x="58" y="102" width="3" height="10" rx="1" fill="#EF4444" />
      <rect x="63" y="101" width="4" height="11" rx="1" fill="#3B82F6" />
      <path d="M48 60 L60 68 L72 60" fill="#374151" />
      <path d="M28 82 C18 88, 12 100, 15 118" stroke="#F59E0B" strokeWidth="14" strokeLinecap="round" fill="none" />
      <circle cx="17" cy="122" r="9" fill="#D97706" />
      <path d="M12 118 L10 112" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 82 C102 75, 108 85, 106 100" stroke="#F59E0B" strokeWidth="14" strokeLinecap="round" fill="none" />
      <circle cx="106" cy="105" r="9" fill="#D97706" />
      <g transform="translate(100, 95) rotate(20)">
        <rect x="0" y="0" width="8" height="35" rx="2" fill="#64748B" />
        <circle cx="4" cy="38" r="8" fill="#475569" stroke="#64748B" strokeWidth="2" />
        <circle cx="4" cy="38" r="4" fill="#334155" />
      </g>
      <rect x="52" y="48" width="16" height="15" rx="4" fill="#D4A574" />
      <circle cx="60" cy="32" r="26" fill="#D4A574" />
      <ellipse cx="60" cy="18" rx="32" ry="6" fill="#F59E0B" />
      <path d="M30 18 C30 2, 45 -5, 60 -5 C75 -5, 90 2, 90 18 C90 20, 88 22, 85 22 L35 22 C32 22, 30 20, 30 18Z" fill="url(#hatGradientStatic)" />
      <path d="M40 8 C45 3, 75 3, 80 8" stroke="white" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round" fill="none" />
      <rect x="30" y="14" width="60" height="4" fill="#D97706" />
      <path d="M40 26 C43 23, 50 23, 53 25" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M67 25 C70 23, 77 23, 80 26" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="47" cy="34" rx="5" ry="5.5" fill="white" />
      <ellipse cx="73" cy="34" rx="5" ry="5.5" fill="white" />
      <circle cx="48" cy="35" r="3.5" fill="#5D4037" />
      <circle cx="74" cy="35" r="3.5" fill="#5D4037" />
      <circle cx="49" cy="33" r="1.5" fill="white" />
      <circle cx="75" cy="33" r="1.5" fill="white" />
      <path d="M58 40 C58 44, 62 46, 62 40" fill="#C4956A" />
      <path d="M50 48 C54 54, 66 54, 70 48" stroke="#A0785C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <g fill="#8B7355" fillOpacity="0.3">
        <circle cx="42" cy="50" r="0.5" />
        <circle cx="45" cy="52" r="0.5" />
        <circle cx="75" cy="52" r="0.5" />
        <circle cx="78" cy="50" r="0.5" />
      </g>
      <ellipse cx="34" cy="36" rx="4" ry="6" fill="#D4A574" />
      <ellipse cx="86" cy="36" rx="4" ry="6" fill="#D4A574" />
      <defs>
        <linearGradient id="overallsGradientStatic" x1="60" y1="58" x2="60" y2="142" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="hatGradientStatic" x1="60" y1="-5" x2="60" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );

  // Static version for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="absolute -inset-6 rounded-full bg-amber-500/15 blur-2xl opacity-40" />
        <div className="relative">
          <StaticSVG />
        </div>
        <div className="mt-4 px-5 py-2.5 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700/50">
          <span className="text-sm font-semibold text-amber-300">Pro contractor</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
      className="relative flex flex-col items-center"
    >
      {/* Character glow */}
      <motion.div
        className="absolute -inset-6 rounded-full bg-amber-500/15 blur-2xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Floating animation wrapper */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="relative"
      >
        <svg width="120" height="180" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <ellipse cx="60" cy="175" rx="35" ry="5" fill="black" fillOpacity="0.15" />

          {/* Legs */}
          <motion.g
            animate={{ rotate: [1, -1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            style={{ originX: 0.5, originY: 0 }}
          >
            <rect x="40" y="130" width="14" height="40" rx="7" fill="#5D4E37" />
            <rect x="66" y="130" width="14" height="40" rx="7" fill="#5D4E37" />
            {/* Work boots */}
            <path d="M35 165 C35 160, 40 158, 47 158 C54 158, 59 160, 59 165 L59 172 C59 175, 54 177, 47 177 C40 177, 35 175, 35 172 Z" fill="#4A4035" />
            <path d="M61 165 C61 160, 66 158, 73 158 C80 158, 85 160, 85 165 L85 172 C85 175, 80 177, 73 177 C66 177, 61 175, 61 172 Z" fill="#4A4035" />
            {/* Boot soles */}
            <rect x="35" y="173" width="24" height="4" rx="2" fill="#2D2520" />
            <rect x="61" y="173" width="24" height="4" rx="2" fill="#2D2520" />
          </motion.g>

          {/* Body / Overalls */}
          <path
            d="M28 82 C28 68, 42 58, 60 58 C78 58, 92 68, 92 82 L92 130 C92 136, 86 142, 78 142 L42 142 C34 142, 28 136, 28 130 Z"
            fill="url(#overallsGradient)"
          />
          {/* Overall straps */}
          <rect x="38" y="58" width="8" height="35" rx="2" fill="#D97706" />
          <rect x="74" y="58" width="8" height="35" rx="2" fill="#D97706" />
          {/* Overall buttons */}
          <circle cx="42" cy="95" r="3" fill="#92400E" />
          <circle cx="78" cy="95" r="3" fill="#92400E" />
          {/* Pocket */}
          <rect x="48" y="105" width="24" height="20" rx="3" fill="#B45309" stroke="#92400E" strokeWidth="1" />
          {/* Tool pocket items */}
          <rect x="52" y="100" width="4" height="12" rx="1" fill="#64748B" />
          <rect x="58" y="102" width="3" height="10" rx="1" fill="#EF4444" />
          <rect x="63" y="101" width="4" height="11" rx="1" fill="#3B82F6" />

          {/* Undershirt visible at neck */}
          <path d="M48 60 L60 68 L72 60" fill="#374151" />

          {/* Arms */}
          <motion.g
            animate={{ rotate: [0, -5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            style={{ originX: 0.2, originY: 0.2 }}
          >
            {/* Left arm */}
            <path
              d="M28 82 C18 88, 12 100, 15 118"
              stroke="#F59E0B"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Work glove */}
            <circle cx="17" cy="122" r="9" fill="#D97706" />
            <path d="M12 118 L10 112" stroke="#D97706" strokeWidth="4" strokeLinecap="round" />
          </motion.g>

          <motion.g
            animate={{ rotate: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: 0.8, originY: 0.2 }}
          >
            {/* Right arm holding tool */}
            <path
              d="M92 82 C102 75, 108 85, 106 100"
              stroke="#F59E0B"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Work glove */}
            <circle cx="106" cy="105" r="9" fill="#D97706" />

            {/* Wrench/Tool */}
            <g transform="translate(100, 95) rotate(20)">
              <rect x="0" y="0" width="8" height="35" rx="2" fill="#64748B" />
              <circle cx="4" cy="38" r="8" fill="#475569" stroke="#64748B" strokeWidth="2" />
              <circle cx="4" cy="38" r="4" fill="#334155" />
            </g>
          </motion.g>

          {/* Neck */}
          <rect x="52" y="48" width="16" height="15" rx="4" fill="#D4A574" />

          {/* Head */}
          <circle cx="60" cy="32" r="26" fill="#D4A574" />

          {/* Hard hat */}
          <g>
            {/* Hat brim */}
            <ellipse cx="60" cy="18" rx="32" ry="6" fill="#F59E0B" />
            {/* Hat dome */}
            <path
              d="M30 18 C30 2, 45 -5, 60 -5 C75 -5, 90 2, 90 18 C90 20, 88 22, 85 22 L35 22 C32 22, 30 20, 30 18Z"
              fill="url(#hatGradient)"
            />
            {/* Hat shine */}
            <path
              d="M40 8 C45 3, 75 3, 80 8"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Hat band */}
            <rect x="30" y="14" width="60" height="4" fill="#D97706" />
          </g>

          {/* Face */}
          {/* Eyebrows - thicker, more rugged */}
          <motion.g
            animate={{ y: [0, -1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <path d="M40 26 C43 23, 50 23, 53 25" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M67 25 C70 23, 77 23, 80 26" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </motion.g>

          {/* Eyes */}
          <g>
            <ellipse cx="47" cy="34" rx="5" ry="5.5" fill="white" />
            <ellipse cx="73" cy="34" rx="5" ry="5.5" fill="white" />
            <motion.g
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, times: [0, 0.5, 1], delay: 0.5 }}
            >
              <circle cx="48" cy="35" r="3.5" fill="#5D4037" />
              <circle cx="74" cy="35" r="3.5" fill="#5D4037" />
              {/* Eye highlights */}
              <circle cx="49" cy="33" r="1.5" fill="white" />
              <circle cx="75" cy="33" r="1.5" fill="white" />
            </motion.g>
          </g>

          {/* Nose */}
          <path d="M58 40 C58 44, 62 46, 62 40" fill="#C4956A" />

          {/* Mouth - friendly grin */}
          <motion.path
            d="M50 48 C54 54, 66 54, 70 48"
            stroke="#A0785C"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            animate={{ d: ["M50 48 C54 54, 66 54, 70 48", "M50 48 C54 55, 66 55, 70 48", "M50 48 C54 54, 66 54, 70 48"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />

          {/* Slight stubble dots */}
          <g fill="#8B7355" fillOpacity="0.3">
            <circle cx="42" cy="50" r="0.5" />
            <circle cx="45" cy="52" r="0.5" />
            <circle cx="75" cy="52" r="0.5" />
            <circle cx="78" cy="50" r="0.5" />
          </g>

          {/* Ears */}
          <ellipse cx="34" cy="36" rx="4" ry="6" fill="#D4A574" />
          <ellipse cx="86" cy="36" rx="4" ry="6" fill="#D4A574" />

          {/* Gradients */}
          <defs>
            <linearGradient id="overallsGradient" x1="60" y1="58" x2="60" y2="142" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="hatGradient" x1="60" y1="-5" x2="60" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FBBF24" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-4 px-5 py-2.5 bg-slate-800/60 backdrop-blur-sm rounded-full border border-slate-700/50"
      >
        <span className="text-sm font-semibold text-amber-300">Pro contractor</span>
      </motion.div>
    </motion.div>
  );
}
