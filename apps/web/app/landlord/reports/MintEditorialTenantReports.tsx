'use client';

/**
 * Mint Editorial port of /landlord/reports (Tenant Reports).
 *
 * Same data shape + filter logic as TenantReportsClient.tsx — only
 * the chrome changes:
 *   - Header → .t-h1 + .t-body
 *   - Filter row → .chip / .chip.on with full per-tab counts
 *     (audit fix: legacy view only counted `all` + `new`)
 *   - Report rows → .card with .badge-{info,warn,ok,mute} status
 *     pills + .badge-{warn,err} urgency pills
 *   - Empty state → <MintEditorialEmptyState> primitive with a
 *     real CTA to /landlord/reporting-links (audit fix: legacy
 *     empty state was a dead end)
 *   - Detail modal → mint-tinted overlay with .card body and
 *     proper next/link nav (audit fix: was raw <a>)
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, FileText, X, Link2 } from 'lucide-react';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

interface Report {
  id: string;
  reporter_name: string;
  reporter_phone: string | null;
  reporter_email: string | null;
  reporter_unit: string | null;
  category: string;
  description: string;
  urgency: string;
  status: string;
  landlord_notes: string | null;
  created_at: string;
  properties: { id: string; property_name: string; address: string } | null;
}

type StatusKey =
  | 'all'
  | 'new'
  | 'acknowledged'
  | 'converted'
  | 'resolved'
  | 'dismissed';

const TABS: { key: StatusKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'converted', label: 'Job created' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
];

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'new') return <span className='badge badge-info'>New</span>;
  if (s === 'acknowledged')
    return <span className='badge badge-warn'>Acknowledged</span>;
  if (s === 'converted')
    return <span className='badge badge-ok'>Job created</span>;
  if (s === 'resolved') return <span className='badge badge-ok'>Resolved</span>;
  if (s === 'dismissed')
    return <span className='badge badge-mute'>Dismissed</span>;
  return <span className='badge badge-mute'>{status}</span>;
}

function urgencyTone(urgency: string): string {
  const u = (urgency || '').toLowerCase();
  if (u === 'urgent' || u === 'emergency' || u === 'high') {
    return 'var(--me-err-fg)';
  }
  if (u === 'medium') return 'var(--me-warn-fg)';
  return 'var(--me-ok-fg)';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function MintEditorialTenantReports({ reports }: { reports: Report[] }) {
  const [filter, setFilter] = useState<StatusKey>('all');
  const [selected, setSelected] = useState<Report | null>(null);

  // Per-tab counts so every chip shows its own number (the legacy
  // client only emitted counts on `all` + `new`).
  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = {
      all: reports.length,
      new: 0,
      acknowledged: 0,
      converted: 0,
      resolved: 0,
      dismissed: 0,
    };
    reports.forEach((r) => {
      const k = r.status as StatusKey;
      if (k in c && k !== 'all') c[k] += 1;
    });
    return c;
  }, [reports]);

  const visible = useMemo(
    () =>
      filter === 'all' ? reports : reports.filter((r) => r.status === filter),
    [reports, filter]
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className='col' style={{ gap: 4, marginBottom: 22 }}>
        <h1 className='t-h1'>Tenant Reports</h1>
        <p className='t-body'>
          Maintenance issues reported by tenants via anonymous reporting links.
        </p>
      </div>

      <div
        className='row'
        style={{ gap: 6, flexWrap: 'wrap', marginBottom: 22 }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type='button'
            className={'chip ' + (filter === t.key ? 'on' : '')}
            onClick={() => setFilter(t.key)}
          >
            {t.label} · {counts[t.key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <MintEditorialEmptyState
          icon={MessageSquare}
          title={filter === 'all' ? 'No reports yet' : `No ${filter} reports`}
          body={
            filter === 'all'
              ? 'Share a reporting link with your tenants so they can flag maintenance issues anonymously.'
              : 'Switch to a different filter to see reports.'
          }
          cta={
            filter === 'all'
              ? {
                  label: 'Create a reporting link',
                  href: '/landlord/reporting-links',
                }
              : undefined
          }
        />
      ) : (
        <div className='col' style={{ gap: 10 }}>
          {visible.map((r) => (
            <button
              key={r.id}
              type='button'
              onClick={() => setSelected(r)}
              className='card card-pad'
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                textAlign: 'left',
                fontFamily: 'inherit',
                cursor: 'pointer',
                background: 'var(--me-surface)',
              }}
            >
              <div className='col' style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
                  {statusBadge(r.status)}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      color: urgencyTone(r.urgency),
                    }}
                  >
                    {r.urgency}
                  </span>
                </div>
                <h3
                  className='t-h4'
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.category.replace(/_/g, ' ')} — {r.reporter_name}
                  {r.reporter_unit ? ` (${r.reporter_unit})` : ''}
                </h3>
                <p
                  className='t-body'
                  style={{
                    fontSize: 12,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.description}
                </p>
                {r.properties ? (
                  <span className='t-meta' style={{ fontSize: 11 }}>
                    {r.properties.property_name}
                  </span>
                ) : null}
              </div>
              <span className='t-meta' style={{ whiteSpace: 'nowrap' }}>
                {formatDate(r.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected ? (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 30, 28, 0.55)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className='card card-pad-lg'
            style={{
              maxWidth: 520,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div
              className='between'
              style={{ marginBottom: 16, alignItems: 'flex-start' }}
            >
              <h2 className='t-h3'>Report details</h2>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                onClick={() => setSelected(null)}
                aria-label='Close'
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
            <div className='col' style={{ gap: 14 }}>
              <div>
                <div className='t-eyebrow' style={{ marginBottom: 4 }}>
                  Reporter
                </div>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {selected.reporter_name}
                </p>
                {selected.reporter_unit ? (
                  <p className='t-meta'>Unit {selected.reporter_unit}</p>
                ) : null}
                {selected.reporter_phone ? (
                  <p className='t-meta'>
                    <a
                      href={`tel:${selected.reporter_phone}`}
                      style={{ color: 'var(--me-brand)' }}
                    >
                      {selected.reporter_phone}
                    </a>
                  </p>
                ) : null}
                {selected.reporter_email ? (
                  <p className='t-meta'>
                    <a
                      href={`mailto:${selected.reporter_email}`}
                      style={{ color: 'var(--me-brand)' }}
                    >
                      {selected.reporter_email}
                    </a>
                  </p>
                ) : null}
              </div>
              <div>
                <div className='t-eyebrow' style={{ marginBottom: 4 }}>
                  Issue
                </div>
                <p
                  className='t-body'
                  style={{ whiteSpace: 'pre-wrap', margin: 0 }}
                >
                  {selected.description}
                </p>
                <p className='t-meta' style={{ marginTop: 8 }}>
                  Category: {selected.category.replace(/_/g, ' ')} ·{' '}
                  <span style={{ color: urgencyTone(selected.urgency) }}>
                    {selected.urgency}
                  </span>
                </p>
              </div>
              {selected.properties ? (
                <div>
                  <div className='t-eyebrow' style={{ marginBottom: 4 }}>
                    Property
                  </div>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {selected.properties.property_name}
                  </p>
                  <p className='t-meta'>{selected.properties.address}</p>
                </div>
              ) : null}
              <div className='row' style={{ gap: 8, marginTop: 6 }}>
                {selected.properties ? (
                  <Link
                    href={{
                      pathname: '/jobs/create',
                      query: {
                        property_id: selected.properties.id,
                        category: selected.category,
                        description: selected.description,
                      },
                    }}
                    className='btn btn-primary btn-sm'
                  >
                    <FileText size={13} strokeWidth={1.75} /> Create job
                  </Link>
                ) : null}
                <Link
                  href='/landlord/reporting-links'
                  className='btn btn-secondary btn-sm'
                >
                  <Link2 size={13} strokeWidth={1.75} /> Manage links
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
