/**
 * DisputeHistoryLine — R7 #11 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Pure view. Renders a transparency line under the contractor name:
 *   "12 disputes, all resolved, avg 3 days"
 *   "2 unresolved disputes"
 * Hidden when both counts are 0 — no point saying "0 disputes".
 */

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  resolvedCount: number;
  unresolvedCount: number;
  avgResolutionHours?: number | null;
}

function formatAvg(hours: number): string {
  if (hours < 48) return `avg ${hours}h`;
  const days = Math.round(hours / 24);
  return `avg ${days} day${days === 1 ? '' : 's'}`;
}

export function DisputeHistoryLine({
  resolvedCount,
  unresolvedCount,
  avgResolutionHours,
}: Props) {
  if (resolvedCount === 0 && unresolvedCount === 0) return null;

  if (unresolvedCount > 0) {
    return (
      <p className='inline-flex items-center gap-1.5 text-sm text-amber-700'>
        <AlertTriangle className='w-3.5 h-3.5' />
        <strong>{unresolvedCount}</strong> unresolved dispute
        {unresolvedCount === 1 ? '' : 's'}
        {resolvedCount > 0 ? ` · ${resolvedCount} resolved` : ''}
      </p>
    );
  }

  return (
    <p className='inline-flex items-center gap-1.5 text-sm text-gray-600'>
      <ShieldCheck className='w-3.5 h-3.5 text-emerald-600' />
      <strong>{resolvedCount}</strong> dispute
      {resolvedCount === 1 ? '' : 's'}, all resolved
      {avgResolutionHours != null ? `, ${formatAvg(avgResolutionHours)}` : ''}
    </p>
  );
}
