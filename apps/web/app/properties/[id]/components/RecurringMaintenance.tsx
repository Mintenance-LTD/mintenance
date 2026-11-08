'use client';
import {
  RecurringAudienceFields,
  emptyAudience,
} from '@/components/recurring/RecurringAudienceFields';
import { scheduleRequest } from '@/lib/schedule-request-key';

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';

import toast from 'react-hot-toast';

import { getCsrfToken } from '@/lib/csrf-client';

interface Schedule {
  id: string;

  title: string;

  category: string | null;

  frequency: string;

  next_due_date: string;

  is_active: boolean;
  updated_at: string;
  preferred_contractor_id?: string | null;
  notification_audience?: 'matching' | 'preferred';
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',

  quarterly: 'Quarterly',

  biannual: 'Every 6 months',

  annual: 'Annually',
};

const FREQUENCY_COLORS: Record<string, string> = {
  biannual: 'bg-purple-100 text-purple-700',

  monthly: 'bg-blue-100 text-blue-700',

  quarterly: 'bg-amber-100 text-amber-700',

  annual: 'bg-green-100 text-green-700',
};

export default function RecurringMaintenance({
  propertyId,
}: {
  propertyId: string;
}) {
  return <ScheduleEditor key={propertyId} propertyId={propertyId} />;
}

function ScheduleEditor({ propertyId }: { propertyId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [loading, setLoading] = useState(true);

  const [audience, setAudience] = useState(emptyAudience);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);

  const [saving, setSaving] = useState(false);

  const savingRef = useRef(false);

  const [loadError, setLoadError] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [staleDraft, setStaleDraft] = useState(false);
  const [recovery, setRecovery] = useState('');
  const mounted = useRef(true);
  const read = useRef<AbortController | null>(null);

  const [form, setForm] = useState({
    title: '',
    category: '',
    frequency: 'monthly',
    next_due_date: '',
  });

  const fetchSchedules = useCallback(async () => {
    if (savingRef.current) return;
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setLoadError('');

    try {
      const res = await fetch(
        `/api/properties/${propertyId}/recurring-maintenance`,
        { signal: controller.signal, cache: 'no-store' }
      );

      if ([401, 403, 404].includes(res.status))
        throw new Error(
          'Access unavailable. Check your account or ask the property owner, then retry.'
        );
      if (!res.ok) throw new Error('Failed to load schedules');

      const data = await res.json();

      if (
        !Array.isArray(data.schedules) ||
        data.schedules.some(
          (row: Schedule) =>
            !row ||
            typeof row.id !== 'string' ||
            typeof row.title !== 'string' ||
            typeof row.frequency !== 'string' ||
            typeof row.is_active !== 'boolean' ||
            typeof row.next_due_date !== 'string' ||
            !Number.isFinite(Date.parse(row.next_due_date))
        )
      )
        throw new Error('Incomplete schedules');
      if (
        !mounted.current ||
        read.current !== controller ||
        controller.signal.aborted
      )
        return;
      setSchedules(data.schedules);
      setNeedsReload(false);
    } catch (error) {
      if (!mounted.current || read.current !== controller) return;
      setLoadError(
        error instanceof Error && !controller.signal.aborted
          ? error.message
          : 'Loading took too long. Retry schedules.'
      );
      setNeedsReload(true);
    } finally {
      clearTimeout(timer);
      if (mounted.current && read.current === controller) setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    mounted.current = true;
    void fetchSchedules();
    return () => {
      mounted.current = false;
      read.current?.abort();
    };
  }, [fetchSchedules]);

  const recoverMutation = (message: string, status?: number) => {
    if (!mounted.current) return;
    toast.error(message);
    if ([401, 403, 404].includes(status ?? 0)) {
      // Preserve full navigation so revoked access also drops private sibling cards.
      window.location.assign('/properties');
      setNeedsReload(true);
    } else if (![400, 402].includes(status ?? 0)) {
      setNeedsReload(true);
      setStaleDraft(!!editing);
      setRecovery(
        'The schedule may have changed. Refresh schedules before another action.' +
          (editing
            ? ' Your draft is retained; after refreshing, discard it and edit the latest schedule to continue.'
            : '')
      );
    }
  };
  const responseMessage = (
    data: { error?: string | { message?: string }; message?: string },
    fallback: string
  ) =>
    (typeof data.error === 'string' ? data.error : data.error?.message) ||
    data.message ||
    fallback;
  const blocked = saving || loading || needsReload || !!loadError;

  const handleAdd = async () => {
    if (savingRef.current || blocked || staleDraft) return;
    if (
      audience.notification_audience === 'preferred' &&
      !audience.preferred_contractor_id
    ) {
      toast.error('Choose a favourite contractor.');
      return;
    }
    if (editing && !editing.updated_at) {
      recoverMutation('Reload schedules before editing.');
      return;
    }

    if (
      form.title.trim().length < 5 ||
      form.title.trim().length > 200 ||
      !form.next_due_date
    ) {
      toast.error('Enter a title of 5–200 characters and a first due date');

      return;
    }

    savingRef.current = true;

    setSaving(true);

    try {
      const operation = editing
        ? null
        : await scheduleRequest(propertyId, { ...form, ...audience });
      const csrfToken = await getCsrfToken();
      if (!mounted.current) return;

      const res = await fetch(
        `/api/properties/${propertyId}/recurring-maintenance`,
        {
          method: editing ? 'PATCH' : 'POST',

          headers: {
            'Content-Type': 'application/json',

            'X-CSRF-Token': csrfToken,
            ...(operation ? { 'Idempotency-Key': operation.key } : {}),
          },

          body: JSON.stringify({
            ...form,
            ...audience,
            ...(editing
              ? {
                  scheduleId: editing.id,
                  expected_updated_at: editing.updated_at,
                }
              : {}),
          }),
        }
      );
      if (!mounted.current) return;

      if (res.ok) {
        const data = await res.json();
        if (!mounted.current) return;

        if (
          !data.schedule?.id ||
          data.schedule.property_id !== propertyId ||
          (editing &&
            (data.schedule.id !== editing.id ||
              !data.schedule.updated_at ||
              data.schedule.updated_at === editing.updated_at))
        )
          throw new Error(
            'Schedule creation could not be confirmed. Refresh before retrying.'
          );

        operation?.complete();
        setSchedules((prev) =>
          editing
            ? prev.map((row) => (row.id === editing.id ? data.schedule : row))
            : [...prev, data.schedule]
        );

        setForm({
          title: '',
          category: '',
          frequency: 'monthly',
          next_due_date: '',
        });

        setShowForm(false);
        setEditing(null);
        setRecovery('');
        toast.success(editing ? 'Schedule updated' : 'Schedule added');
      } else {
        const err = await res.json();
        if (!mounted.current) return;

        const message =
          err.errors?.[0]?.message ||
          err.message ||
          err.error?.message ||
          err.error;
        const text =
          typeof message === 'string' ? message : 'Failed to save schedule';
        if (editing || [401, 403, 404].includes(res.status))
          recoverMutation(text, res.status);
        else toast.error(text);
      }
    } catch (error) {
      if (!mounted.current) return;
      const message =
        error instanceof Error ? error.message : 'Failed to save schedule';
      if (editing) recoverMutation(message);
      else toast.error(message);
    } finally {
      savingRef.current = false;

      if (mounted.current) setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (savingRef.current || blocked) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      if (!mounted.current) return;

      const res = await fetch(
        `/api/properties/${propertyId}/recurring-maintenance?scheduleId=${id}`,
        {
          method: 'DELETE',

          headers: { 'X-CSRF-Token': csrfToken },
        }
      );

      const data = await res.json();
      if (!mounted.current) return;
      if (!res.ok || data.success !== true || data.scheduleId !== id)
        return recoverMutation(
          responseMessage(data, 'Removal was not confirmed.'),
          res.status
        );
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
        if (editing?.id === id) {
          setEditing(null);
          setShowForm(false);
          setStaleDraft(false);
          setRecovery('');
        }

        toast.success('Schedule removed');
      }
    } catch (error) {
      recoverMutation(
        error instanceof Error ? error.message : 'Failed to remove'
      );
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const handleToggle = async (schedule: Schedule) => {
    if (savingRef.current || blocked) return;
    const { id, is_active: currentActive, updated_at } = schedule;
    if (!updated_at)
      return recoverMutation('Reload schedules before changing their status.');
    savingRef.current = true;
    setSaving(true);
    try {
      const csrfToken = await getCsrfToken();
      if (!mounted.current) return;

      const res = await fetch(
        `/api/properties/${propertyId}/recurring-maintenance`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',

            'X-CSRF-Token': csrfToken,
          },

          body: JSON.stringify({
            scheduleId: id,
            is_active: !currentActive,
            expected_updated_at: updated_at,
          }),
        }
      );

      const data = await res.json();
      if (!mounted.current) return;
      if (
        !res.ok ||
        data.schedule?.id !== id ||
        data.schedule.is_active !== !currentActive ||
        data.schedule.property_id !== propertyId ||
        !data.schedule.updated_at ||
        data.schedule.updated_at === updated_at
      )
        return recoverMutation(
          responseMessage(data, 'Update was not confirmed.'),
          res.status
        );
      if (res.ok) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? data.schedule : s))
        );
      }
    } catch (error) {
      recoverMutation(
        error instanceof Error ? error.message : 'Failed to update'
      );
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  // Due dates are calendar dates, not midnight deadlines. Keep today's work due
  // throughout the London day, including for operators in another time zone.
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) =>
    dateParts.find((value) => value.type === type)?.value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const isDueSoon = (date: string) => {
    const days = (Date.parse(date.slice(0, 10)) - Date.parse(today)) / 86400000;
    return days >= 0 && days < 7;
  };
  const isOverdue = (date: string) => date.slice(0, 10) < today;

  if (loadError)
    return (
      <div role='alert'>
        Could not load recurring schedules. {loadError}{' '}
        <button
          className='min-h-11 underline'
          onClick={() => void fetchSchedules()}
        >
          Retry schedules
        </button>
      </div>
    );

  if (loading) {
    return (
      <div className='p-4 border border-gray-200 rounded-xl'>
        <div className='flex items-center gap-2 mb-2'>
          <Calendar className='w-4 h-4 text-teal-600' />

          <h4 className='text-sm font-semibold text-gray-900'>
            Recurring Maintenance
          </h4>
        </div>

        <div
          role='status'
          className='flex items-center justify-center gap-2 py-4'
        >
          <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
          Loading schedules…
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 border border-gray-200 rounded-xl'>
      <div className='flex flex-wrap items-center justify-between gap-2 mb-3'>
        <div className='flex items-center gap-2'>
          <Calendar className='w-4 h-4 text-teal-600' />

          <h4 className='text-sm font-semibold text-gray-900'>
            Recurring Maintenance
          </h4>
        </div>

        <button
          className='min-h-11 text-sm text-teal-800 underline disabled:opacity-50'
          disabled={saving || loading}
          onClick={() => void fetchSchedules()}
        >
          Refresh schedules
        </button>
        <button
          aria-label='Add recurring schedule'
          disabled={blocked || staleDraft}
          onClick={() => {
            setEditing(null);
            setAudience(emptyAudience);
            setForm({
              title: '',
              category: '',
              frequency: 'monthly',
              next_due_date: '',
            });
            setShowForm(!showForm);
          }}
          className='min-h-11 min-w-11 p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50'
        >
          <Plus className='w-4 h-4 text-gray-500' />
        </button>
      </div>

      {recovery && (
        <p role='alert' className='mb-3 text-sm text-amber-900'>
          {recovery}
        </p>
      )}

      {showForm && (
        <fieldset
          disabled={saving}
          className='mb-3 min-w-0 p-3 bg-gray-50 rounded-lg space-y-2'
        >
          {staleDraft && (
            <legend className='text-sm font-semibold'>
              Unsaved draft — review the latest schedule before saving
            </legend>
          )}
          <input
            type='text'
            placeholder='e.g. Boiler service'
            aria-label='Task title'
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            className='w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
          />

          <RecurringAudienceFields
            propertyId={propertyId}
            value={audience}
            onChange={setAudience}
          />

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            <select
              aria-label='Frequency'
              value={form.frequency}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, frequency: e.target.value }))
              }
              className='px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <input
              type='date'
              aria-label='First due date'
              value={form.next_due_date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, next_due_date: e.target.value }))
              }
              className='px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500'
            />
          </div>

          <div className='flex gap-2'>
            <button
              onClick={handleAdd}
              disabled={blocked || staleDraft}
              className='flex-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50'
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Schedule'}
            </button>

            <button
              disabled={saving}
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setAudience(emptyAudience);
                setStaleDraft(false);
                if (!needsReload) setRecovery('');
              }}
              className='px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg'
            >
              Cancel
            </button>
          </div>
        </fieldset>
      )}

      {schedules.length === 0 ? (
        <p className='text-xs text-gray-500'>
          No recurring schedules yet. Add one to track regular maintenance.
        </p>
      ) : (
        <div className='space-y-2'>
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`p-2.5 rounded-lg border text-sm ${!s.is_active ? 'bg-gray-50 border-gray-200' : isOverdue(s.next_due_date) ? 'bg-red-50 border-red-200' : isDueSoon(s.next_due_date) ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}
            >
              <div className='flex flex-wrap items-center justify-between gap-2 mb-1'>
                <span className='min-w-0 break-words font-medium text-gray-900'>
                  {s.title}
                </span>

                <div className='flex flex-wrap items-center gap-2'>
                  <button
                    disabled={blocked}
                    aria-label={`${staleDraft ? 'Discard draft and edit latest' : 'Edit'} ${s.title}`}
                    onClick={() => {
                      setStaleDraft(false);
                      setRecovery('');
                      setEditing(s);
                      setAudience({
                        category: s.category || 'handyman',
                        preferred_contractor_id:
                          s.preferred_contractor_id ?? null,
                        notification_audience:
                          s.notification_audience ?? 'matching',
                      });
                      setForm({
                        title: s.title,
                        category: s.category || '',
                        frequency: s.frequency,
                        next_due_date: s.next_due_date.slice(0, 10),
                      });
                      setShowForm(true);
                    }}
                    className='min-h-11 text-sm text-teal-800 underline disabled:opacity-50'
                  >
                    {staleDraft ? 'Discard draft and edit latest' : 'Edit'}
                  </button>
                  <button
                    disabled={blocked}
                    onClick={() => handleToggle(s)}
                    className='min-h-11 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50'
                  >
                    {s.is_active ? 'Pause' : 'Resume'}
                  </button>

                  <button
                    disabled={blocked}
                    aria-label={`Remove ${s.title}`}
                    onClick={() => handleDelete(s.id)}
                    className='min-h-11 min-w-11 p-2 text-red-700 hover:bg-red-100 rounded disabled:opacity-50'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${FREQUENCY_COLORS[s.frequency] || 'bg-gray-100 text-gray-700'}`}
                >
                  {FREQUENCY_LABELS[s.frequency] || s.frequency}
                </span>

                <span
                  className={`text-sm ${s.is_active && isOverdue(s.next_due_date) ? 'text-red-700 font-medium' : 'text-gray-700'}`}
                >
                  {!s.is_active
                    ? 'Paused · recorded due date'
                    : isOverdue(s.next_due_date)
                      ? 'Overdue'
                      : 'Due'}
                  :{' '}
                  {new Date(
                    s.next_due_date.slice(0, 10) + 'T00:00:00Z'
                  ).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
