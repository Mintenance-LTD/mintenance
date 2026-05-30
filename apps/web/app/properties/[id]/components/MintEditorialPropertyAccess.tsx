'use client';

/**
 * "Access & contacts" tab for /properties/[id].
 *
 * Canonical mock (property-management.html ~lines 743-835): tri-mode
 * access picker, contractor notes textarea, saved-trades list,
 * emergency-contacts card, stopcock/isolators card.
 *
 * Storage: the access fields (access_mode, key_safe_code, access_notes,
 * stopcock_location, etc.) are persisted on `public.properties` per
 * migration `20260520000003_property_access_fields.sql`. PATCH endpoint:
 * `/api/properties/[id]/access`. The contractor side
 * (/contractor/jobs/[id]) surfaces these values to the assigned
 * contractor with `key_safe_code` masked unless the job is at the
 * `ready_to_start` or `in_progress` lifecycle stage.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  KeyRound,
  Lock,
  User,
  ArrowRight,
  AlertTriangle,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import { type JobItem } from './MintEditorialPropertyCards';

type AccessModeKey = 'key_safe' | 'smart_lock' | 'in_person';

export interface PropertyAccessValues {
  access_mode: AccessModeKey | null;
  key_safe_code: string | null;
  access_notes: string | null;
  stopcock_location: string | null;
  gas_isolator_location: string | null;
  consumer_unit_location: string | null;
}

interface AccessModeOption {
  key: AccessModeKey;
  icon: React.ReactNode;
  label: string;
  sub: string;
}

const MODES: AccessModeOption[] = [
  {
    key: 'key_safe',
    icon: <KeyRound size={16} strokeWidth={1.75} />,
    label: 'Key safe',
    sub: 'Code revealed 1h before each job',
  },
  {
    key: 'smart_lock',
    icon: <Lock size={16} strokeWidth={1.75} />,
    label: 'Smart lock',
    // 2026-05-23 audit: per-contractor one-time-code generation isn't
    // implemented — no `smart_lock_codes` table, no provisioning
    // service, no per-contractor reveal flow. The previous copy
    // ("One-time code per contractor") promised a feature that
    // doesn't exist. Relabelled to the honest fallback: contractor
    // sees the instructions written in `access_notes`. Tracked as
    // a dedicated rollout (needs lock vendor selection +
    // OAuth/API integration + schema + reveal flow).
    sub: 'Instructions only — full integration coming soon',
  },
  {
    key: 'in_person',
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
  /** Initial server-fetched access values. Null fields render as
   *  empty inputs / unselected picker. */
  initialAccess?: PropertyAccessValues | null;
}

export function MintEditorialPropertyAccess({
  propertyId,
  jobs,
  initialAccess,
}: Props) {
  const trades = deriveSavedTrades(jobs);
  // 2026-05-27 audit-85 P3: hold the saved baseline in state so a
  // successful save can reset it. Previously the dirty flag was
  // compared against the prop (immutable for the component's life),
  // so after saving "isDirty" stayed true and the Save button never
  // went back to its disabled / "Saved" pill state.
  const [baseline, setBaseline] = useState<PropertyAccessValues>({
    access_mode: initialAccess?.access_mode ?? null,
    key_safe_code: initialAccess?.key_safe_code ?? null,
    access_notes: initialAccess?.access_notes ?? null,
    stopcock_location: initialAccess?.stopcock_location ?? null,
    gas_isolator_location: initialAccess?.gas_isolator_location ?? null,
    consumer_unit_location: initialAccess?.consumer_unit_location ?? null,
  });
  const [mode, setMode] = useState<AccessModeKey | null>(baseline.access_mode);
  const [keySafeCode, setKeySafeCode] = useState(baseline.key_safe_code ?? '');
  const [accessNotes, setAccessNotes] = useState(baseline.access_notes ?? '');
  const [stopcock, setStopcock] = useState(baseline.stopcock_location ?? '');
  const [gasIsolator, setGasIsolator] = useState(
    baseline.gas_isolator_location ?? ''
  );
  const [consumerUnit, setConsumerUnit] = useState(
    baseline.consumer_unit_location ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Normalise a UI string back to the null/string the baseline stores
  // so the dirty + payload checks stay symmetric with the server.
  const norm = (v: string) => (v.trim() ? v.trim() : null);
  const currentKeySafe = norm(keySafeCode);
  const currentNotes = norm(accessNotes);
  const currentStopcock = norm(stopcock);
  const currentGas = norm(gasIsolator);
  const currentConsumer = norm(consumerUnit);

  // Dirty flag + per-field dirty checks. The per-field flags drive the
  // PATCH payload below — see P1.
  const modeDirty = mode !== baseline.access_mode;
  const keySafeDirty = currentKeySafe !== baseline.key_safe_code;
  const notesDirty = currentNotes !== baseline.access_notes;
  const stopcockDirty = currentStopcock !== baseline.stopcock_location;
  const gasDirty = currentGas !== baseline.gas_isolator_location;
  const consumerDirty = currentConsumer !== baseline.consumer_unit_location;
  const isDirty =
    modeDirty ||
    keySafeDirty ||
    notesDirty ||
    stopcockDirty ||
    gasDirty ||
    consumerDirty;

  const handleSave = async () => {
    if (saving || !isDirty) return;
    setSaving(true);
    try {
      // 2026-05-27 audit-85 P1: only PATCH the fields that actually
      // changed. /api/properties/[id]/access blocks non-owner/non-
      // platform-admin callers from touching key_safe_code (even to
      // null), and /api/properties/[id] redacts it to null for
      // managers — so a manager whose form was hydrated with a null
      // key_safe_code, who edited only the notes, was sending
      // {key_safe_code: null, ...} and getting 403. Sending only
      // dirty fields means managers can edit the access fields they
      // are allowed to touch without the owner-only key_safe_code
      // riding along on every save. Mirrors the mobile pattern in
      // PropertyAccessSection.tsx.
      const patchBody: Record<string, unknown> = {};
      if (modeDirty) patchBody.access_mode = mode;
      if (keySafeDirty) patchBody.key_safe_code = currentKeySafe;
      if (notesDirty) patchBody.access_notes = currentNotes;
      if (stopcockDirty) patchBody.stopcock_location = currentStopcock;
      if (gasDirty) patchBody.gas_isolator_location = currentGas;
      if (consumerDirty) patchBody.consumer_unit_location = currentConsumer;

      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/properties/${propertyId}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(body.error || 'Failed to save access details');
      }
      // 2026-05-27 audit-85 P3: reset the dirty baseline to what we
      // just persisted so subsequent edits compare against the latest
      // saved state and the Save button correctly flips back to
      // disabled / "Saved".
      setBaseline({
        access_mode: mode,
        key_safe_code: currentKeySafe,
        access_notes: currentNotes,
        stopcock_location: currentStopcock,
        gas_isolator_location: currentGas,
        consumer_unit_location: currentConsumer,
      });
      setSavedAt(Date.now());
      toast.success('Access details saved');
    } catch (error) {
      logger.error('Failed to save property access', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

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
              {/* Tri-mode picker — clickable now. The selected card
                  uses brand border + brand-soft background; the others
                  stay neutral until clicked. */}
              <div className='row' style={{ gap: 12, marginBottom: 16 }}>
                {MODES.map((m) => {
                  const active = mode === m.key;
                  return (
                    <button
                      key={m.key}
                      type='button'
                      onClick={() => setMode(m.key)}
                      style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 12,
                        border: active
                          ? '2px solid var(--me-brand)'
                          : '1px solid var(--me-line)',
                        background: active
                          ? 'var(--me-brand-soft)'
                          : 'var(--me-surface)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                      aria-pressed={active}
                    >
                      <div
                        className='row'
                        style={{
                          gap: 8,
                          marginBottom: 6,
                          color: active ? 'var(--me-brand)' : 'var(--me-ink-2)',
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
                    </button>
                  );
                })}
              </div>

              {/* Key-safe code input — only shown when key_safe is
                  picked. Marked sensitive in copy. */}
              {mode === 'key_safe' ? (
                <div className='col' style={{ gap: 6, marginBottom: 16 }}>
                  <label
                    htmlFor='access-keysafe-code'
                    className='t-meta'
                    style={{ fontWeight: 600 }}
                  >
                    Lock-box code (only revealed to contractors within 1h of the
                    scheduled start)
                  </label>
                  <input
                    id='access-keysafe-code'
                    type='text'
                    className='field'
                    value={keySafeCode}
                    onChange={(e) => setKeySafeCode(e.target.value)}
                    placeholder='e.g. 4827'
                    maxLength={64}
                    autoComplete='off'
                    style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}
                  />
                </div>
              ) : null}

              {/* Free-text notes — homeowners can leave guidance
                  ("Keys with neighbour at no. 22. Cat in kitchen,
                  please keep door closed."). */}
              <div className='col' style={{ gap: 6, marginBottom: 16 }}>
                <label
                  htmlFor='access-notes'
                  className='t-meta'
                  style={{ fontWeight: 600 }}
                >
                  Notes for the contractor
                </label>
                <textarea
                  id='access-notes'
                  className='field'
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  placeholder='Anything they need to know — neighbour with spare keys, pets, parking instructions…'
                  rows={3}
                  maxLength={2000}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {/* Stopcock / isolator / consumer-unit locations —
                  small inputs side-by-side on wide viewports. */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div className='col' style={{ gap: 4 }}>
                  <label
                    htmlFor='access-stopcock'
                    className='t-meta'
                    style={{ fontWeight: 600 }}
                  >
                    Water stopcock
                  </label>
                  <input
                    id='access-stopcock'
                    type='text'
                    className='field'
                    value={stopcock}
                    onChange={(e) => setStopcock(e.target.value)}
                    placeholder='Under kitchen sink'
                    maxLength={500}
                  />
                </div>
                <div className='col' style={{ gap: 4 }}>
                  <label
                    htmlFor='access-gas'
                    className='t-meta'
                    style={{ fontWeight: 600 }}
                  >
                    Gas isolator
                  </label>
                  <input
                    id='access-gas'
                    type='text'
                    className='field'
                    value={gasIsolator}
                    onChange={(e) => setGasIsolator(e.target.value)}
                    placeholder='Meter cupboard, hall'
                    maxLength={500}
                  />
                </div>
                <div className='col' style={{ gap: 4 }}>
                  <label
                    htmlFor='access-consumer-unit'
                    className='t-meta'
                    style={{ fontWeight: 600 }}
                  >
                    Consumer unit
                  </label>
                  <input
                    id='access-consumer-unit'
                    type='text'
                    className='field'
                    value={consumerUnit}
                    onChange={(e) => setConsumerUnit(e.target.value)}
                    placeholder='Top of stairs cupboard'
                    maxLength={500}
                  />
                </div>
              </div>

              {/* Save bar */}
              <div
                className='between'
                style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
              >
                <div
                  className='row'
                  style={{
                    gap: 6,
                    alignItems: 'center',
                    color: 'var(--me-ink-3)',
                    fontSize: 12,
                  }}
                >
                  {savedAt && !isDirty ? (
                    <>
                      <CheckCircle2
                        size={13}
                        strokeWidth={1.75}
                        style={{ color: 'var(--me-ok)' }}
                      />
                      <span>
                        Saved · contractors on assigned jobs will see this.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle
                        size={13}
                        strokeWidth={1.75}
                        style={{ color: 'var(--me-warn-fg)' }}
                      />
                      <span>
                        Lock-box codes are masked from contractors until escrow
                        is funded.
                      </span>
                    </>
                  )}
                </div>
                <button
                  type='button'
                  className='btn btn-primary btn-sm'
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                >
                  {saving ? (
                    <Loader2
                      size={13}
                      strokeWidth={1.75}
                      className='animate-spin'
                    />
                  ) : (
                    <Save size={13} strokeWidth={1.75} />
                  )}
                  {saving ? 'Saving…' : 'Save access details'}
                </button>
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
