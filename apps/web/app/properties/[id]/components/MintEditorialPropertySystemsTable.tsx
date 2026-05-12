'use client';

/**
 * Major Systems table for the property Overview tab.
 *
 * Canonical mock (property-management.html ~lines 240-310) shows 5
 * rows — Electrical / Plumbing / Roof & gutters / Doors & locks /
 * Paintwork — each with a one-line status, a chip badge, and a
 * "History" link. We don't have a dedicated `property_systems` table
 * yet, so we derive each system's state from job history by category:
 *
 *   - last completed job in that bucket → "Last serviced {date}"
 *   - any active job in that bucket    → "In progress" chip
 *   - nothing on file                  → "No history" muted chip
 *
 * Mapping of canonical categories to grouped systems is deliberately
 * narrow (one bucket per system) so the chip is never ambiguous. The
 * "History" link filters /jobs?property_id=X&category=Y.
 */

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  Droplets,
  Home as HomeIcon,
  KeyRound,
  Paintbrush,
} from 'lucide-react';
import type { JobItem } from './MintEditorialPropertyCards';

interface SystemDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Job categories that map to this system (lowercase). */
  categories: string[];
}

const SYSTEMS: SystemDef[] = [
  {
    key: 'electrical',
    label: 'Electrical',
    icon: <Zap size={16} strokeWidth={1.75} />,
    categories: ['electrical', 'hvac'],
  },
  {
    key: 'plumbing',
    label: 'Plumbing & heating',
    icon: <Droplets size={16} strokeWidth={1.75} />,
    categories: ['plumbing', 'heating'],
  },
  {
    key: 'roof',
    label: 'Roof & gutters',
    icon: <HomeIcon size={16} strokeWidth={1.75} />,
    categories: ['roofing'],
  },
  {
    key: 'doors',
    label: 'Doors & locks',
    icon: <KeyRound size={16} strokeWidth={1.75} />,
    categories: ['carpentry', 'handyman'],
  },
  {
    key: 'paint',
    label: 'Paintwork',
    icon: <Paintbrush size={16} strokeWidth={1.75} />,
    categories: ['painting'],
  },
];

function relTime(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return dateStr;
  const months = (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.4);
  if (months < 1) return 'this month';
  if (months < 11) return `${Math.round(months)} months ago`;
  const years = months / 12;
  return years < 1.5 ? '1 year ago' : `${Math.round(years)} years ago`;
}

function deriveStatus(jobs: JobItem[], cats: string[]) {
  const matching = jobs.filter((j) =>
    cats.includes((j.category || '').toLowerCase())
  );
  const active = matching.find((j) =>
    ['posted', 'assigned', 'in_progress'].includes(j.status)
  );
  const lastDone = matching
    .filter((j) => j.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (active) {
    return {
      copy: `Job in flight · ${active.title}`,
      badge: { tone: 'info' as const, label: 'In progress' },
    };
  }
  if (lastDone) {
    return {
      copy: `Last serviced ${relTime(lastDone.date)}`,
      badge: { tone: 'ok' as const, label: 'OK' },
    };
  }
  return {
    copy: 'Nothing on file yet',
    badge: { tone: 'mute' as const, label: 'No history' },
  };
}

interface Props {
  propertyId: string;
  jobs: JobItem[];
}

export function MintEditorialPropertySystemsTable({ propertyId, jobs }: Props) {
  return (
    <div className='card'>
      <div
        className='between'
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <div className='col' style={{ gap: 2 }}>
          <h2 className='t-h3'>Major systems</h2>
          <span className='t-meta'>
            Pulled from this property&apos;s job history.
          </span>
        </div>
      </div>
      {SYSTEMS.map((sys, i) => {
        const status = deriveStatus(jobs, sys.categories);
        return (
          <div
            key={sys.key}
            className='row'
            style={{
              padding: '14px 20px',
              borderTop: i ? '1px solid var(--me-line-2)' : 0,
              gap: 14,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'var(--me-bg-2)',
                color: 'var(--me-ink-2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {sys.icon}
            </span>
            <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <h3 className='t-h4' style={{ fontSize: 14, fontWeight: 600 }}>
                {sys.label}
              </h3>
              <span className='t-meta'>{status.copy}</span>
            </div>
            <span className={`badge badge-${status.badge.tone}`}>
              {status.badge.label}
            </span>
            <Link
              href={`/jobs?property_id=${propertyId}&category=${sys.categories[0]}`}
              className='btn btn-ghost btn-sm'
              aria-label={`View ${sys.label} history`}
            >
              History <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
