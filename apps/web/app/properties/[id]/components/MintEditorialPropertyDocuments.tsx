'use client';

/**
 * "Documents & receipts" tab for /properties/[id] in Mint Editorial.
 *
 * Canonical mock (property-management.html ~lines 462-541): pinned
 * section + year-grouped doc cards, search input, filter chips.
 *
 * Real data today: every completed job is effectively a receipt
 * (contractor + amount + date), so we render those grouped by year.
 * Pinned warranty/certificate cards require a dedicated documents
 * store + UI that doesn't ship in this slice — we show a one-line
 * affordance instead of inventing rows. Lesson learned from W4
 * /financials: don't paint cards if the data isn't there.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search, Upload } from 'lucide-react';
import { formatGBP, type JobItem } from './MintEditorialPropertyCards';

interface DocRow {
  id: string;
  title: string;
  meta: string;
  tag: string;
  who: string;
  href: string;
  kind: 'PDF' | 'JPG';
}

type Filter = 'all' | 'receipts' | 'certificates' | 'guarantees';

function jobToDoc(job: JobItem): DocRow {
  return {
    id: job.id,
    title: `${job.title} – ${new Date(job.date).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    })}`,
    meta:
      job.amount > 0
        ? `${job.contractor || 'Contractor'} · ${formatGBP(job.amount)}`
        : job.contractor || 'Contractor',
    tag: 'Receipt',
    who: 'Auto-filed',
    href: `/jobs/${job.id}`,
    kind: 'PDF',
  };
}

function groupByYear(docs: DocRow[]): { year: string; docs: DocRow[] }[] {
  const groups = new Map<string, DocRow[]>();
  docs.forEach((d) => {
    const match = d.title.match(/(\d{4})$/);
    const year = match ? match[1] : 'Other';
    const list = groups.get(year) ?? [];
    list.push(d);
    groups.set(year, list);
  });
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => ({ year, docs: list }));
}

interface Props {
  propertyId: string;
  jobs: JobItem[];
}

export function MintEditorialPropertyDocuments({ propertyId, jobs }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const allDocs = useMemo(
    () => jobs.filter((j) => j.status === 'completed').map(jobToDoc),
    [jobs]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byTag =
      filter === 'all'
        ? allDocs
        : allDocs.filter(
            (d) =>
              d.tag.toLowerCase() === filter.slice(0, -1) ||
              d.tag.toLowerCase() === filter
          );
    if (!q) return byTag;
    return byTag.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.meta.toLowerCase().includes(q) ||
        d.tag.toLowerCase().includes(q)
    );
  }, [allDocs, filter, query]);

  const groups = useMemo(() => groupByYear(filtered), [filtered]);
  const counts = {
    all: allDocs.length,
    receipts: allDocs.filter((d) => d.tag === 'Receipt').length,
    certificates: 0,
    guarantees: 0,
  };

  return (
    <div className='col' style={{ gap: 22 }}>
      <div className='row' style={{ alignItems: 'flex-end', gap: 16 }}>
        <div className='col' style={{ gap: 4, flex: 1 }}>
          <h2 className='t-h2' style={{ fontSize: 28 }}>
            Documents &amp; <em>receipts</em>
          </h2>
          <p className='t-body'>
            {allDocs.length} {allDocs.length === 1 ? 'file' : 'files'} ·
            everything Mint has filed for this property.
          </p>
        </div>
        <Link
          href={`/properties/${propertyId}/edit`}
          className='btn btn-secondary btn-sm'
        >
          <Upload size={13} strokeWidth={1.75} /> Upload
        </Link>
      </div>

      <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search
            size={14}
            strokeWidth={1.75}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--me-ink-3)',
              pointerEvents: 'none',
            }}
          />
          <input
            className='field'
            placeholder='Search across all documents…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 36 }}
          />
        </div>
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              ['all', `All · ${counts.all}`],
              ['receipts', `Receipts · ${counts.receipts}`],
              ['certificates', `Certificates · ${counts.certificates}`],
              ['guarantees', `Guarantees · ${counts.guarantees}`],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type='button'
              className={'chip ' + (filter === key ? 'on' : '')}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: '40px 20px' }}
        >
          <FileText
            size={28}
            strokeWidth={1.5}
            style={{ color: 'var(--me-ink-3)', marginBottom: 10 }}
          />
          <h3 className='t-h4' style={{ marginBottom: 6 }}>
            No documents yet
          </h3>
          <p className='t-body' style={{ marginBottom: 14 }}>
            Receipts and certificates land here automatically when jobs
            complete.
          </p>
          <Link
            href={`/jobs/create?property_id=${propertyId}`}
            className='btn btn-primary btn-sm'
          >
            <Plus size={13} strokeWidth={1.75} /> Post a job
          </Link>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.year}>
            <h3 className='t-h3' style={{ marginBottom: 12 }}>
              {g.year}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
              }}
            >
              {g.docs.map((d) => (
                <Link
                  key={d.id}
                  href={d.href}
                  className='card card-pad'
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 48,
                      borderRadius: 6,
                      background: 'var(--me-bg-2)',
                      color: 'var(--me-ink-2)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}
                  >
                    {d.kind}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      className='t-h4'
                      style={{
                        fontSize: 14,
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.title}
                    </h4>
                    <div
                      className='t-meta'
                      style={{ marginBottom: 6, fontSize: 12 }}
                    >
                      {d.meta}
                    </div>
                    <div className='row' style={{ gap: 6, fontSize: 11 }}>
                      <span className='chip' style={{ padding: '2px 8px' }}>
                        {d.tag}
                      </span>
                      <span style={{ color: 'var(--me-ink-3)' }}>
                        · {d.who}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
