'use client';

import dynamic from 'next/dynamic';

// Dynamically import HeroAnimation to avoid SSR issues with framer-motion
const HeroAnimation = dynamic(
  () => import('./hero-animation').then((mod) => ({ default: mod.HeroAnimation })),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full min-h-[520px] flex items-center justify-center">
        <div className="w-full max-w-2xl aspect-[3/2] rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border border-slate-700/50 animate-pulse" />
      </div>
    ),
  }
);

export function HeroAnimationWrapper() {
  return <HeroAnimation />;
}

