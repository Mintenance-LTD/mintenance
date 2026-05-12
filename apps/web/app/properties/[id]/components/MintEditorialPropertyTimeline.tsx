'use client';

/**
 * "Everything that's ever happened" Timeline tab for /properties/[id].
 *
 * Canonical mock (property-management.html ~lines 543-635): a vertical
 * thread of dated events on the left, a "By the numbers" stat list +
 * "Mint memory" AI card on the right.
 *
 * Real data: every job emits 1-2 timeline events depending on status
 * (posted / completed). We group by month-year, compute lightweight
 * portfolio stats from the same array, and keep Mint memory to *real*
 * derived facts (top trade, most-used category) rather than fabricated
 * boiler models or paint colours.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { formatGBP, type JobItem } from './MintEditorialPropertyCards';

type Filter = 'all' | 'jobs' | 'receipts' | 'mint';

interface TimelineItem {
  id: string;
  kind: 'job' | 'done' | 'receipt' | 'mint';
  group: string;
  ts: number;
  title: string;
  body: string;
  href?: string;
  tone: 'ok' | 'warn' | 'mute';
}

function groupKey(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - ts) / (1000 * 60 * 60 * 24);
  if (diff < 1) return 'Today';
  if (diff < 7) return 'Last week';
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function buildItems(jobs: JobItem[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  jobs.forEach((j) => {
    const ts = new Date(j.date).getTime();
    if (Number.isNaN(ts)) return;
    if (j.status === 'completed') {
      items.push({
        id: `${j.id}-done`,
        kind: 'done',
        group: groupKey(ts),
        ts,
        title: `${j.title} complete`,
        body:
          j.amount > 0
            ? `${j.contractor || 'Contractor'} · ${formatGBP(j.amount)}`
            : j.contractor || 'Contractor',
        href: `/jobs/${j.id}`,
        tone: 'ok',
      });
      items.push({
        id: `${j.id}-receipt`,
        kind: 'receipt',
        group: groupKey(ts),
        ts: ts - 1000, // sort just below the "complete" event
        title: 'Receipt filed',
        body: j.amount > 0 ? formatGBP(j.amount) : 'Receipt',
        href: `/jobs/${j.id}`,
        tone: 'mute',
      });
    } else {
      items.push({
        id: `${j.id}-posted`,
        kind: 'job',
        group: groupKey(ts),
        ts,
        title: `${j.title} ${j.status === 'in_progress' ? 'in progress' : j.status}`,
        body: j.contractor
          ? `${j.contractor}${j.amount > 0 ? ` · ${formatGBP(j.amount)}` : ''}`
          : `Posted · ${j.category || 'General'}`,
        href: `/jobs/${j.id}`,
        tone: j.status === 'in_progress' ? 'warn' : 'mute',
      });
    }
  });
  return items.sort((a, b) => b.ts - a.ts);
}

function deriveStats(jobs: JobItem[]) {
  const completed = jobs.filter((j) => j.status === 'completed');
  const totalSpent = completed.reduce((s, j) => s + (j.amount || 0), 0);
  const avg = completed.length ? totalSpent / completed.length : 0;
  const sortedTimes = completed
    .map((j) => new Date(j.date).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  let gapWeeks: number | null = null;
  if (sortedTimes.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < sortedTimes.length; i++) {
      diffs.push(
        (sortedTimes[i] - sortedTimes[i - 1]) / (1000 * 60 * 60 * 24 * 7)
      );
    }
    gapWeeks = diffs.reduce((s, n) => s + n, 0) / diffs.length;
  }
  const contractorCounts = new Map<string, number>();
  completed.forEach((j) => {
    if (j.contractor) {
      contractorCounts.set(
        j.contractor,
        (contractorCounts.get(j.contractor) ?? 0) + 1
      );
    }
  });
  const fave = [...contractorCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    totalJobs: jobs.length,
    totalSpent,
    avg,
    gapWeeks,
    fave,
  };
}

interface Props {
  jobs: JobItem[];
}

export function MintEditorialPropertyTimeline({ jobs }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const items = useMemo(() => buildItems(jobs), [jobs]);
  const stats = useMemo(() => deriveStats(jobs), [jobs]);

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'jobs')
      return items.filter((i) => i.kind === 'job' || i.kind === 'done');
    if (filter === 'receipts') return items.filter((i) => i.kind === 'receipt');
    return items.filter((i) => i.kind === 'mint');
  }, [items, filter]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, TimelineItem[]>();
    visible.forEach((it) => {
      const arr = byGroup.get(it.group) ?? [];
      arr.push(it);
      byGroup.set(it.group, arr);
    });
    return [...byGroup.entries()];
  }, [visible]);

  return (
    <div className='col' style={{ gap: 18 }}>
      <div className='between' style={{ alignItems: 'flex-end', gap: 16 }}>
        <div className='col' style={{ gap: 4 }}>
          <h2 className='t-h2' style={{ fontSize: 28 }}>
            Everything <em>that&apos;s happened</em>
          </h2>
          <p className='t-body'>
            Every job, every receipt — one searchable thread.
          </p>
        </div>
        <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              ['all', 'All'],
              ['jobs', 'Jobs'],
              ['receipts', 'Receipts'],
              ['mint', 'Mint notes'],
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 28,
          alignItems: 'flex-start',
        }}
      >
        <div>
          {groups.length === 0 ? (
            <div
              className='card card-pad'
              style={{ textAlign: 'center', padding: '40px 20px' }}
            >
              <h3 className='t-h4' style={{ marginBottom: 6 }}>
                Nothing on file yet
              </h3>
              <p className='t-body'>
                Once you post a job, its progress lands here automatically.
              </p>
            </div>
          ) : (
            groups.map(([group, list]) => (
              <div key={group} style={{ marginBottom: 22 }}>
                <div
                  className='t-eyebrow'
                  style={{ marginBottom: 10, color: 'var(--me-ink-3)' }}
                >
                  {group}
                </div>
                <div className='col' style={{ gap: 10 }}>
                  {list.map((it) => (
                    <Link
                      key={it.id}
                      href={it.href ?? '#'}
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
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background:
                            it.tone === 'ok'
                              ? 'var(--me-brand)'
                              : it.tone === 'warn'
                                ? 'var(--me-warn-fg)'
                                : 'var(--me-ink-3)',
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className='row'
                          style={{ gap: 8, marginBottom: 2 }}
                        >
                          <span
                            className='chip'
                            style={{ padding: '2px 8px', fontSize: 11 }}
                          >
                            {it.kind === 'mint'
                              ? 'Mint'
                              : it.kind === 'done'
                                ? 'Done'
                                : it.kind === 'receipt'
                                  ? 'Receipt'
                                  : 'Job'}
                          </span>
                        </div>
                        <h3
                          className='t-h4'
                          style={{ fontSize: 14, marginBottom: 2 }}
                        >
                          {it.title}
                        </h3>
                        <p
                          className='t-body'
                          style={{ fontSize: 12, margin: 0 }}
                        >
                          {it.body}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <aside className='col' style={{ gap: 16, position: 'sticky', top: 84 }}>
          <div className='card card-pad'>
            <div className='t-eyebrow' style={{ marginBottom: 12 }}>
              By the numbers
            </div>
            {[
              ['Total jobs', String(stats.totalJobs)],
              [
                'Total spent',
                stats.totalSpent > 0 ? formatGBP(stats.totalSpent) : '—',
              ],
              [
                'Avg per job',
                stats.avg > 0 ? formatGBP(Math.round(stats.avg)) : '—',
              ],
              [
                'Avg gap between jobs',
                stats.gapWeeks ? `${Math.round(stats.gapWeeks)} weeks` : '—',
              ],
              [
                'Favourite contractor',
                stats.fave ? `${stats.fave[0]} (${stats.fave[1]}×)` : '—',
              ],
            ].map(([k, v], i) => (
              <div
                key={k}
                className='row'
                style={{
                  padding: '8px 0',
                  borderTop: i ? '1px solid var(--me-line-2)' : 0,
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--me-ink-3)', flex: 1 }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          <div
            className='card card-pad'
            style={{
              background:
                'linear-gradient(180deg, var(--me-brand-soft) 0%, var(--me-surface) 60%)',
              border: '1px solid var(--me-brand-soft)',
            }}
          >
            <div className='row' style={{ gap: 10, marginBottom: 8 }}>
              <Sparkles
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--me-brand)' }}
              />
              <h4 className='t-h4'>Mint memory</h4>
            </div>
            {stats.fave ? (
              <p
                className='t-body'
                style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}
              >
                You&apos;ve hired <strong>{stats.fave[0]}</strong>{' '}
                {stats.fave[1]} times. I&apos;ll suggest them by default when
                you next post a job at this property.
              </p>
            ) : (
              <p
                className='t-body'
                style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}
              >
                I haven&apos;t learned this property&apos;s rhythm yet. Once
                you&apos;ve hired a couple of trades I&apos;ll remember who does
                what.
              </p>
            )}
            <Link
              href={`/jobs/create?property_id=${jobs[0]?.id ? '' : ''}`}
              className='btn btn-ghost btn-sm'
              style={{ marginTop: 10 }}
            >
              See my preferences <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
