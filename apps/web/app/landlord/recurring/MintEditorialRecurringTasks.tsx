'use client';

/**
 * Mint Editorial port of /landlord/recurring.
 *
 * Same data path as RecurringTasksClient.tsx. Visual diffs:
 *   - Header → .t-h1 + .t-body
 *   - Alerts → .badge-warn / .badge-err strips at the top
 *   - New task form → .card .card-pad with .field inputs and
 *     .btn-primary save
 *   - Schedule list → .card rows with status tile (overdue / due
 *     soon / on track) + days-until on the right
 *   - Empty state → <MintEditorialEmptyState> with RefreshCw icon
 *
 * Functional fix (audit P2): POST /api/landlord/recurring now sends
 * a CSRF header. Same reasoning as the contacts + reporting-links
 * ports.
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

interface Property {
  id: string;
  property_name: string;
  address: string;
}

interface Schedule {
  id: string;
  property_id: string;
  task_type: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  next_due_date: string;
  last_completed_date: string | null;
  auto_create_job: boolean;
  is_active: boolean;
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  annual: 'Annually',
};

const TASK_TYPES = [
  'Gas Safety Check',
  'EICR Inspection',
  'Boiler Service',
  'Gutter Cleaning',
  'Fire Alarm Test',
  'Legionella Assessment',
  'Garden Maintenance',
  'Chimney Sweep',
  'Pest Inspection',
  'General Inspection',
] as const;

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

interface StatusInfo {
  Icon: typeof AlertTriangle;
  bg: string;
  fg: string;
  label: string;
}

function statusFor(days: number): StatusInfo {
  if (days < 0) {
    return {
      Icon: AlertTriangle,
      bg: 'var(--me-err-bg)',
      fg: 'var(--me-err-fg)',
      label: `${Math.abs(days)}d overdue`,
    };
  }
  if (days <= 30) {
    return {
      Icon: Clock,
      bg: 'var(--me-warn-bg)',
      fg: 'var(--me-warn-fg)',
      label: days === 0 ? 'Due today' : `${days}d`,
    };
  }
  return {
    Icon: CheckCircle2,
    bg: 'var(--me-ok-bg)',
    fg: 'var(--me-ok-fg)',
    label: `${days}d`,
  };
}

export function MintEditorialRecurringTasks({
  properties,
  schedules: initialSchedules,
}: {
  properties: Property[];
  schedules: Schedule[];
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    property_id: '',
    task_type: 'General Inspection',
    title: '',
    description: '',
    frequency: 'annual',
    next_due_date: '',
    auto_create_job: false,
  });

  const propertyName = (id: string) =>
    properties.find((p) => p.id === id)?.property_name || 'Unknown property';

  const sorted = useMemo(
    () =>
      [...schedules].sort(
        (a, b) =>
          new Date(a.next_due_date).getTime() -
          new Date(b.next_due_date).getTime()
      ),
    [schedules]
  );

  const overdue = sorted.filter(
    (s) => s.is_active && daysUntil(s.next_due_date) < 0
  );
  const dueSoon = sorted.filter((s) => {
    const d = daysUntil(s.next_due_date);
    return s.is_active && d >= 0 && d <= 30;
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.property_id ||
      !formData.title.trim() ||
      !formData.next_due_date ||
      saving
    )
      return;
    setSaving(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch('/api/landlord/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({
          ...formData,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const { schedule } = await res.json();
      setSchedules((prev) => [...prev, schedule]);
      setShowForm(false);
      setFormData({
        property_id: '',
        task_type: 'General Inspection',
        title: '',
        description: '',
        frequency: 'annual',
        next_due_date: '',
        auto_create_job: false,
      });
      toast.success('Recurring task created');
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className='between' style={{ marginBottom: 22, gap: 16 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Recurring Tasks</h1>
          <p className='t-body'>
            Schedule maintenance on a regular cycle — gas safety, EICRs, boiler
            services, anything that comes back.
          </p>
        </div>
        <button
          type='button'
          className='btn btn-primary'
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={14} strokeWidth={1.75} />
          {showForm ? 'Cancel' : 'New task'}
        </button>
      </div>

      {overdue.length > 0 ? (
        <div
          className='card card-pad'
          style={{
            background: 'var(--me-err-bg)',
            border: '1px solid var(--me-err-fg)',
            marginBottom: 12,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle
            size={18}
            strokeWidth={1.75}
            style={{ color: 'var(--me-err-fg)', flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p
              style={{ fontWeight: 600, color: 'var(--me-err-fg)', margin: 0 }}
            >
              {overdue.length} overdue task
              {overdue.length > 1 ? 's' : ''}
            </p>
            <p
              className='t-meta'
              style={{ color: 'var(--me-err-fg)', marginTop: 2 }}
            >
              {overdue.map((s) => s.title).join(' · ')}
            </p>
          </div>
        </div>
      ) : null}

      {dueSoon.length > 0 ? (
        <div
          className='card card-pad'
          style={{
            background: 'var(--me-warn-bg)',
            border: '1px solid var(--me-warn-fg)',
            marginBottom: 18,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Clock
            size={18}
            strokeWidth={1.75}
            style={{ color: 'var(--me-warn-fg)', flexShrink: 0, marginTop: 2 }}
          />
          <p style={{ fontWeight: 600, color: 'var(--me-warn-fg)', margin: 0 }}>
            {dueSoon.length} task{dueSoon.length > 1 ? 's' : ''} due within 30
            days
          </p>
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className='card card-pad'
          style={{ marginBottom: 18 }}
        >
          <div className='between' style={{ marginBottom: 12 }}>
            <h2 className='t-h4'>New recurring task</h2>
            <button
              type='button'
              className='btn btn-ghost btn-sm'
              onClick={() => setShowForm(false)}
              aria-label='Close form'
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className='col' style={{ gap: 10 }}>
            <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
              <select
                required
                className='field'
                value={formData.property_id}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, property_id: e.target.value }))
                }
                style={{ flex: '1 1 220px', minWidth: 220 }}
              >
                <option value=''>Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_name}
                  </option>
                ))}
              </select>
              <select
                className='field'
                value={formData.task_type}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    task_type: e.target.value,
                    title: e.target.value,
                  }))
                }
                style={{ flex: '1 1 200px', minWidth: 200 }}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <input
              required
              type='text'
              className='field'
              placeholder='Task title'
              value={formData.title}
              onChange={(e) =>
                setFormData((p) => ({ ...p, title: e.target.value }))
              }
            />
            <div className='row' style={{ gap: 10, flexWrap: 'wrap' }}>
              <select
                className='field'
                value={formData.frequency}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, frequency: e.target.value }))
                }
                style={{ flex: '1 1 180px', minWidth: 180 }}
              >
                {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                required
                type='date'
                className='field'
                value={formData.next_due_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, next_due_date: e.target.value }))
                }
                style={{ flex: '1 1 180px', minWidth: 180 }}
              />
            </div>
            <label
              className='row'
              style={{ gap: 8, fontSize: 13, color: 'var(--me-ink-2)' }}
            >
              <input
                type='checkbox'
                checked={formData.auto_create_job}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    auto_create_job: e.target.checked,
                  }))
                }
              />
              Automatically create a job when due
            </label>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={
                saving ||
                !formData.property_id ||
                !formData.title.trim() ||
                !formData.next_due_date
              }
              style={{ alignSelf: 'flex-start' }}
            >
              {saving ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      ) : null}

      {sorted.length === 0 ? (
        <MintEditorialEmptyState
          icon={RefreshCw}
          title='No recurring tasks yet'
          body='Set up recurring maintenance so nothing slips — gas safety, EICRs, boiler services, gutter cleaning, all in one place.'
          cta={{
            label: 'Create your first task',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <div className='col' style={{ gap: 10 }}>
          {sorted.map((schedule) => {
            const days = daysUntil(schedule.next_due_date);
            const status = statusFor(days);
            return (
              <div
                key={schedule.id}
                className='card card-pad'
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  opacity: schedule.is_active ? 1 : 0.6,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: status.bg,
                    color: status.fg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <status.Icon size={16} strokeWidth={1.75} />
                </span>
                <div className='col' style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <div className='row' style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {schedule.title}
                    </span>
                    {schedule.auto_create_job ? (
                      <span className='badge badge-info'>Auto-job</span>
                    ) : null}
                  </div>
                  <span className='t-meta' style={{ fontSize: 12 }}>
                    {propertyName(schedule.property_id)} ·{' '}
                    {FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}
                  </span>
                </div>
                <div
                  className='col'
                  style={{ alignItems: 'flex-end', gap: 0, flexShrink: 0 }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: status.fg,
                    }}
                  >
                    {status.label}
                  </span>
                  <span className='t-meta' style={{ fontSize: 11 }}>
                    {new Date(schedule.next_due_date).toLocaleDateString(
                      'en-GB',
                      { day: 'numeric', month: 'short', year: 'numeric' }
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
