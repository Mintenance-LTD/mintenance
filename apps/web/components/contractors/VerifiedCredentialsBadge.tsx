'use client';

/**
 * VerifiedCredentialsBadge — public-facing row of "Verified" badges on
 * contractor profiles. Renders one pill per verified credential
 * (gas_safe / niceic / trustmark) from /api/contractors/[id]/credentials.
 *
 * Silent when the contractor has zero verified credentials (no clutter
 * on new profiles).
 *
 * R4 of docs/RETENTION_ROADMAP_2026.md.
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface Credential {
  id: string;
  register: 'gas_safe' | 'niceic' | 'trustmark' | 'other';
  verified_at: string | null;
  expires_at: string | null;
}

const LABEL: Record<Credential['register'], string> = {
  gas_safe: 'Gas Safe',
  niceic: 'NICEIC',
  trustmark: 'TrustMark',
  other: 'Verified',
};

interface Props {
  contractorId: string;
  className?: string;
}

export function VerifiedCredentialsBadge({ contractorId, className }: Props) {
  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/contractors/${contractorId}/credentials`,
          { cache: 'force-cache' }
        );
        if (!res.ok) return;
        const body = (await res.json()) as { credentials?: Credential[] };
        setCredentials(body.credentials ?? []);
      } catch {
        // silent
      }
    })();
  }, [contractorId]);

  if (credentials.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {credentials.map((c) => (
        <span
          key={c.id}
          className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'
          title={
            c.verified_at
              ? `Verified ${new Date(c.verified_at).toLocaleDateString('en-GB')}`
              : undefined
          }
        >
          <ShieldCheck className='w-3.5 h-3.5' />
          {LABEL[c.register]}
        </span>
      ))}
    </div>
  );
}

export default VerifiedCredentialsBadge;
