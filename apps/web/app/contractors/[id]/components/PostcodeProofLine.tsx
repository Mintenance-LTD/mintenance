/**
 * PostcodeProofLine — R7 #9 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Pure view. Renders nothing when `count` is null (< 2 households on
 * this postcode in 12mo). Trust signal lives under the contractor name
 * on the public profile.
 */

import React from 'react';
import { MapPin } from 'lucide-react';

interface Props {
  count: number | null | undefined;
  postcodePrefix?: string | null;
}

export function PostcodeProofLine({ count, postcodePrefix }: Props) {
  if (!count || !postcodePrefix) return null;
  return (
    <p className='inline-flex items-center gap-1.5 text-sm text-emerald-700'>
      <MapPin className='w-3.5 h-3.5' />
      Hired by <strong>{count}</strong> household{count === 1 ? '' : 's'} on{' '}
      <strong>{postcodePrefix}</strong> in the last 12 months
    </p>
  );
}
