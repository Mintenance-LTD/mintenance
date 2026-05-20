'use client';

/**
 * Hire-again banner — shows at the top of `/jobs/create` when the
 * homeowner arrived via the "Hire again" menu on a completed job.
 * The Quick Actions menu deep-links to
 * `/jobs/create?preferredContractor=<id>&title=...&description=...`
 * and this component reads the contractor's display name (best-
 * effort) so the banner can read "Hiring Sarah's Plumbing again".
 *
 * If the contractor lookup fails (deleted profile, network error)
 * we fall back to "Hiring your previous contractor again" rather
 * than disappearing — the intent of the rebook is still conveyed.
 *
 * 2026-05-13 loop closure: the form now forwards `preferredContractor`
 * to /api/jobs which fires a direct `job_invitation_from_repeat_client`
 * notification to the contractor. The normal nearby-broadcast still
 * runs (so other contractors can still bid). This banner is no longer
 * informational-only.
 */

import React, { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import { logger } from '@mintenance/shared';

interface HireAgainBannerProps {
  preferredContractorId: string | null;
}

interface ContractorSummary {
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
}

function displayName(c: ContractorSummary | null): string {
  if (!c) return 'your previous contractor';
  if (c.company_name) return c.company_name;
  const parts = [c.first_name, c.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'your previous contractor';
}

export function HireAgainBanner({
  preferredContractorId,
}: HireAgainBannerProps) {
  const [contractor, setContractor] = useState<ContractorSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!preferredContractorId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/contractors/${preferredContractorId}`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setContractor({
          first_name: data?.first_name ?? null,
          last_name: data?.last_name ?? null,
          company_name: data?.company_name ?? null,
        });
      } catch (err) {
        logger.warn('Failed to fetch preferred contractor summary', {
          error: err,
        });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [preferredContractorId]);

  if (!preferredContractorId) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        background: 'var(--me-brand-soft)',
        border: '1px solid var(--me-brand)',
        marginBottom: 16,
      }}
    >
      <Repeat
        size={18}
        strokeWidth={1.75}
        style={{ color: 'var(--me-brand)', marginTop: 2, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--me-ink)',
          }}
        >
          Hiring {displayName(contractor)} again
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--me-ink-2)',
            marginTop: 2,
          }}
        >
          {loaded
            ? 'They&apos;ll be notified first when you post this job. Other contractors can still bid.'
            : 'Loading contractor details…'}
        </div>
      </div>
    </div>
  );
}
