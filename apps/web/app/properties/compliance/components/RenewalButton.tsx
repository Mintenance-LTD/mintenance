'use client';

/**
 * Renewal CTA for an expiring/expired compliance certificate — creates (or
 * reuses) the renewal job and sends the landlord straight to it.
 *
 * Extracted from `ComplianceDashboardClient.tsx` 2026-07-26 to keep that file
 * under the 500-line pre-commit budget after wiring in the certificate
 * capture modal — the same reason `compliance-types.ts` and
 * `complianceHelpers.tsx` were split out of it earlier.
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Wrench } from 'lucide-react';
import { getCsrfHeaders } from '@/lib/csrf-client';

export function RenewalButton({ certId }: { certId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRenew = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/${certId}/renew`, {
        method: 'POST',
        headers: { ...(await getCsrfHeaders()) },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create renewal job');
        return;
      }
      if (data.alreadyExists) {
        toast('A renewal job already exists', { icon: 'ℹ️' });
      } else {
        toast.success('Renewal job created!');
      }
      window.location.href = `/jobs/${data.jobId}`;
    } catch {
      toast.error('Failed to create renewal job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type='button'
      onClick={handleRenew}
      disabled={loading}
      className='inline-flex items-center gap-1 text-xs px-2 py-1 bg-white/80 rounded border border-current/20 hover:bg-white transition-colors disabled:opacity-50'
    >
      <Wrench className='w-3 h-3' />
      {loading ? 'Creating...' : 'Renew Now'}
    </button>
  );
}
