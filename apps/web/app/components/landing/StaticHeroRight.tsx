'use client';

import { CheckCircle2, Wrench, Shield, Zap } from 'lucide-react';

export interface StaticHeroRightProps {
  /** When true and count provided, show "X+ verified pros"; otherwise "Verified pros" (no fake counts). */
  activeContractors?: number | null;
  hasRealStats?: boolean;
}

/**
 * Static hero right column. Used when @react-three/fiber is not installed (avoids build error).
 * Shows contractor count only when hasRealStats and activeContractors are provided.
 */
export function StaticHeroRight({ activeContractors = null, hasRealStats = false }: StaticHeroRightProps) {
  const prosLabel =
    hasRealStats && activeContractors != null
      ? `${Number(activeContractors).toLocaleString()}+ verified pros`
      : 'Verified pros';

  return (
    <div className="relative w-full h-[600px] min-h-[520px] rounded-2xl bg-slate-900/40 border border-white/10 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 via-transparent to-slate-900/30 rounded-2xl" />
      <div className="relative z-10 text-center px-6 space-y-8 max-w-md">
        <div className="w-28 h-28 mx-auto rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
          <Wrench className="w-14 h-14 text-teal-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Trusted tradespeople</h2>
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
