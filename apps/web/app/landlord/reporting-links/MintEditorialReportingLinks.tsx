'use client';

/**
 * Mint Editorial port of /landlord/reporting-links.
 *
 * Canonical-classes chrome over the same data path. Visual diffs vs.
 * the legacy `ReportingLinksClient`:
 *   - Header → .t-h1 + .t-body
 *   - Create-link card → .card .card-pad with .field inputs and
 *     .btn-primary action
 *   - Token list rows → .card with property name, copy/open/toggle
 *     buttons styled with .btn-ghost
 *   - Empty state → <MintEditorialEmptyState> with Link2 icon
 *
 * Functional fix (audit P1): every mutating call (POST + PATCH) now
 * forwards a CSRF header via `getCsrfHeaders()`. The legacy client
 * sent neither header, which would 403 the moment the API route
 * enforces CSRF (`csrf: true` is the default on withApiHandler).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  ToggleLeft,
  ToggleRight,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { safeCopyToClipboard } from '@/lib/utils/clipboard';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

interface Property {
  id: string;
  property_name: string;
  address: string;
}

interface Token {
  id: string;
  property_id: string;
  token: string;
  is_active: boolean;
  label: string | null;
  total_reports: number;
  last_report_at: string | null;
  created_at: string;
}

export function MintEditorialReportingLinks({
  properties,
  tokens: initialTokens,
}: {
  properties: Property[];
  tokens: Token[];
}) {
  const [tokens, setTokens] = useState(initialTokens);
  const [creating, setCreating] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [label, setLabel] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const propertyName = (id: string) =>
    properties.find((p) => p.id === id)?.property_name || 'Unknown property';

  const copyLink = async (token: string, id: string) => {
    const url = `${window.location.origin}/report/${token}`;
    const ok = await safeCopyToClipboard(url);
    if (ok) {
      setCopiedId(id);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error('Failed to copy. Please copy the link manually.');
    }
  };

  const createToken = async () => {
    if (!selectedProperty || creating) return;
    setCreating(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(
        `/api/properties/${selectedProperty}/report-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          body: JSON.stringify({ label: label.trim() || null }),
        }
      );
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const { token } = await res.json();
      setTokens((prev) => [token, ...prev]);
      setSelectedProperty('');
      setLabel('');
      toast.success('Reporting link created');
    } catch {
      toast.error('Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const toggleToken = async (t: Token) => {
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/properties/${t.property_id}/report-token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ token_id: t.id, is_active: !t.is_active }),
      });
      if (!res.ok) throw new Error('Failed');
      setTokens((prev) =>
        prev.map((row) =>
          row.id === t.id ? { ...row, is_active: !t.is_active } : row
        )
      );
      toast.success(t.is_active ? 'Link deactivated' : 'Link reactivated');
    } catch {
      toast.error('Failed to update link');
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className='col' style={{ gap: 4, marginBottom: 22 }}>
        <h1 className='t-h1'>Reporting Links</h1>
        <p className='t-body'>
          Create shareable links so tenants can report maintenance issues
          anonymously.
        </p>
      </div>

      {/* Create new link */}
      <div className='card card-pad' style={{ marginBottom: 18 }}>
        <h2 className='t-h4' style={{ marginBottom: 12 }}>
          New reporting link
        </h2>
        {properties.length === 0 ? (
          <p className='t-meta'>
            You need at least one property before you can create a reporting
            link.{' '}
            <Link
              href='/properties/add'
              style={{ color: 'var(--me-brand)', fontWeight: 600 }}
            >
              Add a property
            </Link>
            .
          </p>
        ) : (
          <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
            <select
              className='field'
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              style={{ flex: '1 1 200px', minWidth: 200 }}
            >
              <option value=''>Select a property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.property_name}
                </option>
              ))}
            </select>
            <input
              type='text'
              className='field'
              placeholder='Label (optional)'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ flex: '1 1 160px', minWidth: 160 }}
            />
            <button
              type='button'
              className='btn btn-primary'
              onClick={createToken}
              disabled={!selectedProperty || creating}
            >
              <Plus size={14} strokeWidth={1.75} />
              {creating ? 'Creating…' : 'Create link'}
            </button>
          </div>
        )}
      </div>

      {/* Token list */}
      {tokens.length === 0 ? (
        <MintEditorialEmptyState
          icon={Link2}
          title='No reporting links yet'
          body='Create a link above and share it with your tenants. They can report issues without needing an account.'
        />
      ) : (
        <div className='col' style={{ gap: 10 }}>
          {tokens.map((t) => (
            <div
              key={t.id}
              className='card card-pad'
              style={{
                opacity: t.is_active ? 1 : 0.6,
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div className='col' style={{ gap: 4, flex: 1, minWidth: 220 }}>
                <div
                  className='row'
                  style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <Building2
                    size={14}
                    strokeWidth={1.75}
                    style={{ color: 'var(--me-ink-3)' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {propertyName(t.property_id)}
                  </span>
                  {t.label ? (
                    <span className='chip' style={{ fontSize: 11 }}>
                      {t.label}
                    </span>
                  ) : null}
                  {!t.is_active ? (
                    <span className='badge badge-mute'>Inactive</span>
                  ) : null}
                </div>
                <code
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 11,
                    color: 'var(--me-ink-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  /report/{t.token}
                </code>
                <div className='t-meta' style={{ fontSize: 11 }}>
                  {t.total_reports}{' '}
                  {t.total_reports === 1 ? 'report' : 'reports'} · Created{' '}
                  {new Date(t.created_at).toLocaleDateString('en-GB')}
                  {t.last_report_at
                    ? ` · Last ${new Date(t.last_report_at).toLocaleDateString('en-GB')}`
                    : ''}
                </div>
              </div>
              <div className='row' style={{ gap: 6, flexShrink: 0 }}>
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={() => copyLink(t.token, t.id)}
                  aria-label='Copy link'
                >
                  {copiedId === t.id ? (
                    <Check
                      size={13}
                      strokeWidth={1.75}
                      style={{ color: 'var(--me-ok-fg)' }}
                    />
                  ) : (
                    <Copy size={13} strokeWidth={1.75} />
                  )}
                </button>
                <a
                  href={`/report/${t.token}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn btn-ghost btn-sm'
                  aria-label='Open link'
                >
                  <ExternalLink size={13} strokeWidth={1.75} />
                </a>
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={() => toggleToken(t)}
                  aria-label={t.is_active ? 'Deactivate' : 'Reactivate'}
                >
                  {t.is_active ? (
                    <ToggleRight
                      size={16}
                      strokeWidth={1.75}
                      style={{ color: 'var(--me-brand)' }}
                    />
                  ) : (
                    <ToggleLeft
                      size={16}
                      strokeWidth={1.75}
                      style={{ color: 'var(--me-ink-3)' }}
                    />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
