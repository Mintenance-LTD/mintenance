'use client';

/**
 * "Access & contacts" tab for /properties/[id].
 *
 * Canonical mock (property-management.html ~lines 743-835): tri-mode
 * access picker, contractor notes textarea, saved-trades list,
 * emergency-contacts card, stopcock/isolators card.
 *
 * Storage: the canonical fields (access_mode, key_safe_code, notes,
 * stopcock_location, etc.) don't have a DB home yet. To stay honest
 * with the W1-W5 "no fake persistence" rule we render the picker as
 * read-only with a clear "Setup coming soon" affordance, plus a link
 * to the team-access feature card on the Manage tab (which DOES
 * persist tenant contacts today). Saved trades are derived from real
 * job history — contractors who've completed work here.
 */

import React from 'react';
import Link from 'next/link';
import { KeyRound, Lock, User, ArrowRight, AlertTriangle } from 'lucide-react';
import { type JobItem } from './MintEditorialPropertyCards';

interface AccessMode {
  key: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}

const MODES: AccessMode[] = [
  {
    key: 'keysafe',
    icon: <KeyRound size={16} strokeWidth={1.75} />,
    label: 'Key safe',
    sub: 'Code revealed 1h before each job',
  },
  {
    key: 'smartlock',
    icon: <Lock size={16} strokeWidth={1.75} />,
    label: 'Smart lock',
    sub: 'One-time code per contractor',
  },
  {
    key: 'inperson',
    icon: <User size={16} strokeWidth={1.75} />,
    label: "You'll be home",
    sub: 'Default — needs scheduling',
  },
];

const EMERGENCY: [string, string][] = [
  ['Gas (National Grid)', '0800 111 999'],
  ['Water (Thames)', '0800 316 9800'],
  ['Power (UKPN)', '105'],
  ['Police non-emerg.', '101'],
];

interface SavedTrade {
  name: string;
  category: string;
  jobs: number;
  last: string;
}

function deriveSavedTrades(jobs: JobItem[]): SavedTrade[] {
  const map = new Map<string, SavedTrade>();
  jobs
    .filter((j) => j.contractor)
    .forEach((j) => {
      const name = j.contractor as string;
      const existing = map.get(name);
      const lastDate = new Date(j.date);
      const isNewer =
        !existing ||
        lastDate.getTime() >
          new Date(existing.last.split(' · ')[1] || 0).getTime();
      map.set(name, {
        name,
        category: j.category || 'General',
        jobs: (existing?.jobs ?? 0) + 1,
        last: isNewer
          ? `${j.title} · ${lastDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
          : (existing?.last ??
            `${j.title} · ${lastDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`),
      });
    });
  return [...map.values()].sort((a, b) => b.jobs - a.jobs);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface Props {
  propertyId: string;
  jobs: JobItem[];
}

export function MintEditorialPropertyAccess({ propertyId, jobs }: Props) {
  const trades = deriveSavedTrades(jobs);

  return (
    <div className='col' style={{ gap: 22 }}>
      <div className='col' style={{ gap: 4 }}>
        <h2 className='t-h2' style={{ fontSize: 28 }}>
          Access &amp; <em>contacts</em>
        </h2>
        <p className='t-body'>
          Who can get in, what they need to know, who to call when something
          breaks.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 22,
          alignItems: 'flex-start',
        }}
      >
        <div className='col' style={{ gap: 22 }}>
          <div>
            <h3 className='t-h3' style={{ marginBottom: 12 }}>
              How contractors get in
            </h3>
            <div className='card card-pad'>
              <div className='row' style={{ gap: 12, marginBottom: 16 }}>
                {MODES.map((m, i) => (
                  <div
                    key={m.key}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 12,
                      border:
                        i === 0
                          ? '2px solid var(--me-brand)'
                          : '1px solid var(--me-line)',
                      background:
                        i === 0 ? 'var(--me-brand-soft)' : 'var(--me-surface)',
                    }}
                  >
                    <div
                      className='row'
                      style={{
                        gap: 8,
                        marginBottom: 6,
                        color: i === 0 ? 'var(--me-brand)' : 'var(--me-ink-2)',
                      }}
                    >
                      {m.icon}
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: 'var(--me-ink)',
                        }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <p className='t-meta' style={{ margin: 0, fontSize: 12 }}>
                      {m.sub}
                    </p>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: 12,
                  borderRadius: 9,
                  background: 'var(--me-bg-2)',
                  border: '1px solid var(--me-line-2)',
                  fontSize: 12,
                  color: 'var(--me-ink-2)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle
                  size={14}
                  strokeWidth={1.75}
                  style={{
                    color: 'var(--me-warn-fg)',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <span>
                  Editing your default access mode + notes ships in the next
                  release. Until then, share access details directly in the job
                  thread.
                </span>
              </div>
            </div>
          </div>

          <div>
            <div
              className='between'
              style={{ alignItems: 'flex-end', marginBottom: 12 }}
            >
              <h3 className='t-h3'>Your saved trades</h3>
              <span className='t-meta'>{trades.length} on file</span>
            </div>
            {trades.length === 0 ? (
              <div
                className='card card-pad'
                style={{ textAlign: 'center', padding: '32px 20px' }}
              >
                <p className='t-body' style={{ marginBottom: 10 }}>
                  No trades yet. Pros show up here automatically after they
                  complete a job at this property.
                </p>
                <Link
                  href={`/jobs/create?property_id=${propertyId}`}
                  className='btn btn-primary btn-sm'
                >
                  Post a job
                </Link>
              </div>
            ) : (
              <div className='card'>
                {trades.map((t, i) => (
                  <div
                    key={t.name}
                    className='row'
                    style={{
                      padding: '14px 18px',
                      borderTop: i ? '1px solid var(--me-line-2)' : 0,
                      gap: 14,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      className='avatar'
                      style={{
                        width: 36,
                        height: 36,
                        background: 'var(--me-brand-soft)',
                        color: 'var(--me-brand)',
                        fontWeight: 600,
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}
                    >
                      {initials(t.name)}
                    </span>
                    <div
                      className='col'
                      style={{ gap: 2, flex: 1, minWidth: 0 }}
                    >
                      <h4
                        className='t-h4'
                        style={{ fontSize: 14, fontWeight: 600 }}
                      >
                        {t.name}
                      </h4>
                      <span className='t-meta' style={{ fontSize: 12 }}>
                        {t.category} · {t.jobs} {t.jobs === 1 ? 'job' : 'jobs'}{' '}
                        · {t.last}
                      </span>
                    </div>
                    <Link
                      href={`/messages?contractorName=${encodeURIComponent(t.name)}`}
                      className='btn btn-ghost btn-sm'
                    >
                      Message
                    </Link>
                    <Link
                      href={`/jobs/create?property_id=${propertyId}&contractor=${encodeURIComponent(t.name)}`}
                      className='btn btn-secondary btn-sm'
                    >
                      Rebook
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className='col' style={{ gap: 16 }}>
          <div className='card card-pad'>
            <div className='t-eyebrow' style={{ marginBottom: 10 }}>
              Emergency contacts
            </div>
            {EMERGENCY.map(([k, v], i) => (
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
                <a
                  href={`tel:${v.replace(/\s/g, '')}`}
                  style={{
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'var(--me-ink)',
                    textDecoration: 'none',
                  }}
                >
                  {v}
                </a>
              </div>
            ))}
          </div>
          <div className='card card-pad'>
            <div className='t-eyebrow' style={{ marginBottom: 10 }}>
              Stopcock &amp; isolators
            </div>
            <p
              className='t-body'
              style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}
            >
              Save the exact location of your water stopcock, gas isolator, and
              consumer unit. Mint will surface it to any pro you dispatch.
            </p>
            <Link
              href={`/properties/${propertyId}/edit`}
              className='btn btn-ghost btn-sm'
            >
              Add details <ArrowRight size={12} strokeWidth={1.75} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
