'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle2, Shield, Zap, Wrench } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Set to true only after:
 * 1. npm install (so @react-three/fiber@9.0.0-alpha.0 is in lockfile)
 * 2. rimraf apps/web/.next && npm run dev
 * Otherwise ReactCurrentOwner error (R3F + React 19).
 */
const USE_HERO_3D = false;

function WrenchBlock() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-28 h-28 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
        <Wrench className="w-14 h-14 text-teal-400" />
      </div>
    </div>
  );
}

const TradespersonHouseScene = USE_HERO_3D
  ? dynamic(
      () =>
        import('./hero-3d/TradespersonHouseScene')
          .then((m) => ({ default: m.TradespersonHouseScene }))
          .catch(() => ({ default: WrenchBlock })),
      {
        ssr: false,
        loading: () => (
          <div className="w-full h-[300px] rounded-2xl bg-slate-900/50 border border-white/5 animate-pulse flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-slate-800/80" />
          </div>
        ),
      }
    )
  : null;

export interface HeroCardWith3DProps {
  activeContractors?: number | null;
  hasRealStats?: boolean;
}

function CardContent({
  prosLabel,
  use3D,
}: {
  prosLabel: string;
  use3D: boolean;
}) {
  return (
    <div className="relative z-10 flex flex-col items-center w-full h-full">
      <div className="w-full flex-shrink-0" style={{ height: 300 }}>
        {use3D && TradespersonHouseScene ? (
          <TradespersonHouseScene />
        ) : (
          <WrenchBlock />
        )}
      </div>
      <div className="text-center px-6 pb-6 space-y-4 flex-1 flex flex-col justify-center max-w-md">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            Trusted tradespeople
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Post a job or browse verified contractors. Secure payments, guaranteed work.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            Secure Escrow
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            Instant Matching
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 text-teal-400/80 text-xs">
          <CheckCircle2 className="w-4 h-4" />
          <span>{prosLabel}</span>
        </div>
      </div>
    </div>
  );
}

export function HeroCardWith3D({ activeContractors = null, hasRealStats = false }: HeroCardWith3DProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const prosLabel =
    hasRealStats && activeContractors != null
      ? `${Number(activeContractors).toLocaleString()}+ verified pros`
      : 'Verified pros';

  const use3D = USE_HERO_3D && mounted && !prefersReducedMotion;

  if (!mounted) {
    return (
      <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl bg-slate-900/40 border border-white/10 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-slate-900/30 rounded-2xl" />
        <div className="w-28 h-28 rounded-full bg-slate-800/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-slate-900/30 rounded-2xl pointer-events-none" />
      <CardContent prosLabel={prosLabel} use3D={use3D} />
    </div>
  );
}
