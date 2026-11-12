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
  Droplets,
  Flame,
  Zap,
  Info,
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
    sub: 'Instructions only',
  },
  {
    key: 'in_person',
    icon: <User size={16} strokeWidth={1.75} />,
    label: 'Meet on site',
    sub: 'Arrange for someone to meet the contractor',
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
  entrySecretUnavailable?: boolean;
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
  entrySecretUnavailable = false,
}: Props) {
  const trades = deriveSavedTrades(jobs);
  // 2026-05-27 audit-85 P3: hold the saved baseline in state so a
  // successful save can reset it. Previously the dirty flag was
  // compared against the prop (immutable for the component's life),
  // so after saving "isDirty" stayed true and the Save button never
  // went back to its disabled / "Saved" pill state.
  const [baseline, setBaseline] = useState<PropertyAccessValues>({
    access_mode: initialAccess?.access_mode ?? null,
    key_safe_code: initialAccess?.key_safe_code?.trim() || null,
    access_notes: initialAccess?.access_notes?.trim() || null,
    stopcock_location: initialAccess?.stopcock_location?.trim() || null,
    gas_isolator_location: initialAccess?.gas_isolator_location?.trim() || null,
    consumer_unit_location:
      initialAccess?.consumer_unit_location?.trim() || null,
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
  const keySafeDirty =
    !entrySecretUnavailable && currentKeySafe !== baseline.key_safe_code;
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
    if (saving || !isDirty || entrySecretUnavailable) return;
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

  function resetChanges() {
    setMode(baseline.access_mode);
    setKeySafeCode(baseline.key_safe_code ?? '');
    setAccessNotes(baseline.access_notes ?? '');
    setStopcock(baseline.stopcock_location ?? '');
    setGasIsolator(baseline.gas_isolator_location ?? '');
    setConsumerUnit(baseline.consumer_unit_location ?? '');
  }
  return (
    <fieldset
      disabled={entrySecretUnavailable || saving}
      className='pw-stack'
      style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
    >
      {entrySecretUnavailable && (
        <p
          id='entry-code-unavailable'
          role='alert'
          className='pw-notice pw-error'
        >
          The saved entry code could not be loaded. Refresh the page before
          editing access details.
        </p>
      )}
      <div className='pw-split'>
        <div className='pw-stack'>
          <section className='pw-card'>
            <h2>Contractor access</h2>
            <div className='pw-mode-grid'>
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type='button'
                  className='pw-mode'
                  onClick={() => setMode(m.key)}
                  aria-pressed={mode === m.key}
                >
                  <span className='pw-row'>
                    {m.icon}
                    <strong>{m.label}</strong>
                  </span>
                  <small>{m.sub}</small>
                </button>
              ))}
            </div>
            <div className='pw-stack'>
              {mode === 'key_safe' && (
                <label className='pw-label' htmlFor='access-keysafe-code'>
                  Lock-box code
                  <input
                    id='access-keysafe-code'
                    className='pw-field'
                    type='password'
                    autoComplete='off'
                    maxLength={64}
                    value={keySafeCode}
                    onChange={(e) => setKeySafeCode(e.target.value)}
                  />
                </label>
              )}
              {mode === 'in_person' && (
                <p className='pw-notice'>
                  <User size={18} />
                  Include who will meet the contractor and how to contact them
                  in your instructions.
                </p>
              )}
              <label className='pw-label' htmlFor='access-notes'>
                Access instructions
                <textarea
                  id='access-notes'
                  className='pw-field'
                  rows={4}
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  maxLength={2000}
                  placeholder='Add parking, pets, meeting arrangements and entry information for the contractor…'
                />
              </label>
              <p className='pw-row pw-muted' style={{ fontSize: 13 }}>
                <Lock size={16} />
                Sensitive access details are shared only with authorised
                contractors.
              </p>
            </div>
          </section>
          <section className='pw-card'>
            <h2>Utility locations</h2>
            {[
              {
                id: 'access-stopcock',
                label: 'Water stopcock',
                icon: Droplets,
                value: stopcock,
                set: setStopcock,
                placeholder: 'e.g. Under kitchen sink',
              },
              {
                id: 'access-gas',
                label: 'Gas isolator',
                icon: Flame,
                value: gasIsolator,
                set: setGasIsolator,
                placeholder: 'e.g. Meter cupboard',
              },
              {
                id: 'access-consumer-unit',
                label: 'Consumer unit',
                icon: Zap,
                value: consumerUnit,
                set: setConsumerUnit,
                placeholder: 'e.g. Hall cupboard',
              },
            ].map(({ id, label, icon: Icon, value, set, placeholder }) => (
              <div key={id} className='pw-utility'>
                <span className='pw-icon'>
                  <Icon size={22} />
                </span>
                <label htmlFor={id}>
                  <strong>{label}</strong>
                </label>
                <input
                  className='pw-field'
                  id={id}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  maxLength={500}
                />
              </div>
            ))}
          </section>
        </div>
        <aside className='pw-stack'>
          <section className='pw-card'>
            <h2>Emergency contacts</h2>
            {EMERGENCY.map(([label, phone], i) => (
              <div className='pw-summary-row' key={label}>
                <span className='pw-icon'>
                  {i === 0 ? (
                    <Flame />
                  ) : i === 1 ? (
                    <Droplets />
                  ) : i === 2 ? (
                    <Zap />
                  ) : (
                    <User />
                  )}
                </span>
                <strong style={{ fontSize: 14 }}>{label}</strong>
                <a
                  href={'tel:' + phone.replace(/\s/g, '')}
                  className='pw-text-button'
                >
                  {phone}
                </a>
              </div>
            ))}
            <p className='pw-notice' style={{ marginTop: 16 }}>
              <Info size={18} />
              These are directory contacts. Confirm the water supplier and
              electricity network for this property.
            </p>
          </section>
          <section className='pw-card'>
            <h2>Saved trades</h2>
            {trades.length ? (
              trades.map((t) => (
                <div
                  key={t.name}
                  className='pw-stack'
                  style={{ padding: '12px 0' }}
                >
                  <div className='pw-row'>
                    <span className='pw-icon' style={{ borderRadius: '50%' }}>
                      {initials(t.name)}
                    </span>
                    <div>
                      <strong>{t.name}</strong>
                      <p className='pw-muted' style={{ fontSize: 13 }}>
                        {t.category} · {t.jobs} jobs · {t.last}
                      </p>
                    </div>
                  </div>
                  <div className='pw-actions'>
                    <Link
                      className='pw-btn pw-btn-small'
                      href={
                        '/messages?contractorName=' + encodeURIComponent(t.name)
                      }
                    >
                      Message
                    </Link>
                    <Link
                      className='pw-btn pw-btn-small'
                      href={
                        '/jobs/create?property_id=' +
                        propertyId +
                        '&contractor=' +
                        encodeURIComponent(t.name)
                      }
                    >
                      Rebook
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className='pw-muted'>
                Trades from this property's jobs will appear here.
              </p>
            )}
          </section>
        </aside>
      </div>
      <div className='pw-savebar'>
        <span className='pw-row' role='status'>
          {isDirty ? (
            <>
              <AlertTriangle size={20} color='#ab6505' />
              Unsaved changes
            </>
          ) : savedAt ? (
            <>
              <CheckCircle2 size={20} />
              Changes saved
            </>
          ) : (
            <>
              <Lock size={18} />
              Access details
            </>
          )}
        </span>
        <div className='pw-actions'>
          {isDirty && (
            <button className='pw-btn' onClick={resetChanges} type='button'>
              Cancel
            </button>
          )}
          <button
            type='button'
            className='pw-btn pw-btn-primary'
            disabled={!isDirty || saving || entrySecretUnavailable}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 size={18} className='animate-spin' />
            ) : (
              <Save size={18} />
            )}{' '}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </fieldset>
  );
}
