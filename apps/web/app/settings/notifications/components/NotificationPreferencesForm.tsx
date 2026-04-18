'use client';

/**
 * NotificationPreferencesForm — user-facing settings for the
 * user_notification_preferences row. Drives /api/user/notification-preferences.
 *
 * Minimum R2 shape: three channel toggles + quiet-hours window +
 * timezone + a list of known notification types the user can mute.
 */

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';

interface Prefs {
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  disabled_types: string[];
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

// Canonical event names a homeowner or contractor might want to mute.
// Must stay in sync with the `type` values used by
// NotificationService.createNotification() call sites.
const KNOWN_TYPES: Array<{ type: string; label: string }> = [
  { type: 'job_nearby', label: 'New jobs posted near you' },
  { type: 'bid_received', label: 'New bids received' },
  { type: 'bid_accepted', label: 'Your bid was accepted' },
  { type: 'contract_signed', label: 'Contract signed' },
  { type: 'payment', label: 'Payment updates' },
  { type: 'escrow_released', label: 'Payment released' },
  { type: 'escrow_auto_released', label: 'Auto-release on 7-day timeout' },
  { type: 'job_completed', label: 'Job completed' },
  { type: 'changes_requested', label: 'Homeowner requested changes' },
  { type: 'message_received', label: 'New messages' },
  { type: 'cashflow_digest', label: 'Weekly cash-flow digest (Fridays)' },
];

const DEFAULTS: Prefs = {
  push_enabled: true,
  email_enabled: true,
  in_app_enabled: true,
  disabled_types: [],
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
};

// A handful of common IANA zones. Users in other zones can still type
// into the field (we validate only length server-side) — this list just
// covers the easy cases for the UK/EU rollout.
const COMMON_TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
];

function trimTime(v: string | null): string {
  if (!v) return '';
  // accept HH:MM or HH:MM:SS, show HH:MM
  return v.length >= 5 ? v.slice(0, 5) : v;
}

export function NotificationPreferencesForm() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const disabledSet = useMemo(
    () => new Set(prefs.disabled_types),
    [prefs.disabled_types]
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user/notification-preferences', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = (await res.json()) as Prefs;
        setPrefs({
          ...DEFAULTS,
          ...body,
          disabled_types: Array.isArray(body.disabled_types)
            ? body.disabled_types
            : [],
        });
      } catch (err) {
        logger.warn('Failed to load notification preferences', { err });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleType = (type: string) => {
    setPrefs((prev) => {
      const next = new Set(prev.disabled_types);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...prev, disabled_types: Array.from(next) };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          push_enabled: prefs.push_enabled,
          email_enabled: prefs.email_enabled,
          in_app_enabled: prefs.in_app_enabled,
          disabled_types: prefs.disabled_types,
          quiet_hours_start: prefs.quiet_hours_start || null,
          quiet_hours_end: prefs.quiet_hours_end || null,
          timezone: prefs.timezone || 'UTC',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `status ${res.status}`);
      }
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className='text-sm text-gray-500'>Loading preferences…</div>;
  }

  return (
    <div className='space-y-8 max-w-2xl'>
      <section className='bg-white border border-gray-200 rounded-xl p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Channels</h2>
        {(
          [
            ['push_enabled', 'Push notifications (mobile app)'],
            ['email_enabled', 'Email'],
            ['in_app_enabled', 'In-app notifications'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className='flex items-center justify-between py-2'>
            <span className='text-sm text-gray-800'>{label}</span>
            <input
              type='checkbox'
              checked={prefs[key]}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, [key]: e.target.checked }))
              }
              className='w-5 h-5 accent-teal-600'
            />
          </label>
        ))}
      </section>

      <section className='bg-white border border-gray-200 rounded-xl p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-2'>
          Quiet hours
        </h2>
        <p className='text-sm text-gray-500 mb-4'>
          During these hours we won&rsquo;t push to your phone; notifications
          arrive in-app or queue for delivery at the end of the window.
        </p>
        <div className='grid grid-cols-2 gap-3 mb-3'>
          <label className='block text-sm'>
            <span className='text-gray-700 font-medium'>Start</span>
            <input
              type='time'
              value={trimTime(prefs.quiet_hours_start)}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  quiet_hours_start: e.target.value || null,
                }))
              }
              className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2'
            />
          </label>
          <label className='block text-sm'>
            <span className='text-gray-700 font-medium'>End</span>
            <input
              type='time'
              value={trimTime(prefs.quiet_hours_end)}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  quiet_hours_end: e.target.value || null,
                }))
              }
              className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2'
            />
          </label>
        </div>
        <label className='block text-sm'>
          <span className='text-gray-700 font-medium'>Timezone</span>
          <select
            value={
              COMMON_TIMEZONES.includes(prefs.timezone)
                ? prefs.timezone
                : 'custom'
            }
            onChange={(e) => {
              if (e.target.value === 'custom') return;
              setPrefs((p) => ({ ...p, timezone: e.target.value }));
            }}
            className='mt-1 w-full border border-gray-300 rounded-lg px-3 py-2'
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
            {!COMMON_TIMEZONES.includes(prefs.timezone) && (
              <option value='custom'>{prefs.timezone} (custom)</option>
            )}
          </select>
        </label>
      </section>

      <section className='bg-white border border-gray-200 rounded-xl p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-2'>
          Per-event mute
        </h2>
        <p className='text-sm text-gray-500 mb-4'>
          Turn off specific notifications you don&rsquo;t want to hear about —
          everything else keeps firing per your channel settings.
        </p>
        <div className='space-y-2'>
          {KNOWN_TYPES.map((t) => (
            <label
              key={t.type}
              className='flex items-center justify-between py-1.5'
            >
              <span className='text-sm text-gray-800'>{t.label}</span>
              <input
                type='checkbox'
                checked={!disabledSet.has(t.type)}
                onChange={() => toggleType(t.type)}
                className='w-5 h-5 accent-teal-600'
              />
            </label>
          ))}
        </div>
      </section>

      <div className='flex justify-end'>
        <button
          onClick={save}
          disabled={saving}
          className='bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors'
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </div>
    </div>
  );
}

export default NotificationPreferencesForm;
