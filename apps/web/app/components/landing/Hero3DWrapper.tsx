'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CheckCircle2 } from 'lucide-react';

const Hero3DScene = dynamic(
  () => import('./hero-3d/Hero3DScene').then((m) => ({ default: m.Hero3DScene })),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full min-h-[520px] flex items-center justify-center rounded-2xl">
        <div className="w-full max-w-lg aspect-square rounded-2xl bg-slate-900/50 border border-white/5 animate-pulse flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-slate-800/80" />
        </div>
      </div>
    ),
  }
);

function StaticFallback() {
  return (
    <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl bg-slate-900/30 border border-white/5 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/40">
          <CheckCircle2 className="w-12 h-12 text-teal-400" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Find trusted tradespeople</h2>
        <p className="text-slate-400 max-w-xs mx-auto text-sm">Post a job or browse contractors to get started.</p>
      </div>
    </div>
  );
}

export function Hero3DWrapper() {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="relative w-full min-h-[520px] flex items-center justify-center rounded-2xl">
        <div className="w-full max-w-lg aspect-square rounded-2xl bg-slate-900/50 border border-white/5 animate-pulse flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-slate-800/80" />
        </div>
      </div>
    );
  }
  if (prefersReducedMotion) return <StaticFallback />;
  return <Hero3DScene />;
}
