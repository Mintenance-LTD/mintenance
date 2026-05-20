'use client';

/**
 * Homeowner-side editor for the pre-arrival checklist.
 *
 * Renders on the right rail of `/jobs/[id]`. Lets the homeowner add /
 * remove / reorder items the contractor should tick before or on
 * arrival. Read-only view of completion state (contractor ticks).
 *
 * Backed by:
 *   - migration 20260520000004_job_checklists.sql
 *   - GET    /api/jobs/[id]/checklist
 *   - POST   /api/jobs/[id]/checklist                 (add)
 *   - PATCH  /api/jobs/[id]/checklist/[itemId]        (rename)
 *   - DELETE /api/jobs/[id]/checklist/[itemId]
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, X, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

interface ChecklistItem {
  id: string;
  label: string;
  position: number;
  completed_at: string | null;
}

interface Props {
  jobId: string;
  /** When the job is past assignment, hide the add/remove controls —
   *  changing items after the contractor has started is confusing. */
  jobStatus: string | null;
}

const COMMON_TEMPLATES = [
  'Confirm Gas Safe certificate is current',
  'Bring magnetic filter spare',
  'Take "before" photos when on site',
  'Notify customer 30 mins before arrival',
];

export function HomeownerChecklistEditor({ jobId, jobStatus }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const allowEdit = jobStatus === 'posted' || jobStatus === 'assigned';

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      logger.error('Error fetching homeowner checklist', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (label: string) => {
    const text = label.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const csrf = await getCsrfHeaders();
      const res = await fetch(`/api/jobs/${jobId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrf },
        credentials: 'include',
        body: JSON.stringify({ label: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(body.error || 'Failed to add item');
      }
      const data = await res.json();
      setItems((prev) => [...prev, data.item]);
      setNewLabel('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (removingId) return;
    setRemovingId(id);
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const csrf = await getCsrfHeaders();
      const res = await fetch(`/api/jobs/${jobId}/checklist/${id}`, {
        method: 'DELETE',
        headers: csrf,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
      setItems(previous);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return null;

  // Hide the card entirely when the job is past assignment AND no
  // items exist — there's nothing to look at and editing isn't
  // allowed.
  if (!allowEdit && items.length === 0) return null;

  const completedCount = items.filter((i) => i.completed_at).length;

  return (
    <div className='card card-pad'>
      <div className='col' style={{ gap: 12 }}>
        <div className='between' style={{ alignItems: 'center' }}>
          <h3 className='t-h3' style={{ margin: 0 }}>
            Pre-arrival checklist
          </h3>
          {items.length > 0 ? (
            <span
              className='t-meta'
              style={{
                fontWeight: 600,
                color:
                  completedCount === items.length
                    ? 'var(--me-ok)'
                    : 'var(--me-ink-2)',
              }}
            >
              {completedCount} / {items.length} done
            </span>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className='t-body' style={{ fontSize: 13 }}>
            Add items your contractor should confirm before arriving. They see
            this on their job detail and tick each one when complete.
          </p>
        ) : (
          <ul
            className='col'
            style={{
              gap: 6,
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {items.map((item) => {
              const done = !!item.completed_at;
              return (
                <li
                  key={item.id}
                  className='row'
                  style={{
                    gap: 10,
                    padding: '8px 10px',
                    border: '1px solid var(--me-line)',
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  {done ? (
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.75}
                      style={{ color: 'var(--me-ok)', fill: 'var(--me-ok)' }}
                    />
                  ) : (
                    <Circle
                      size={16}
                      strokeWidth={1.75}
                      style={{ color: 'var(--me-ink-3)' }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      flex: 1,
                      textDecoration: done ? 'line-through' : 'none',
                      color: done ? 'var(--me-ink-3)' : 'var(--me-ink)',
                    }}
                  >
                    {item.label}
                  </span>
                  {allowEdit ? (
                    <button
                      type='button'
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className='btn btn-ghost btn-sm'
                      aria-label={`Remove ${item.label}`}
                      style={{ padding: '4px 6px', color: 'var(--me-err)' }}
                    >
                      {removingId === item.id ? (
                        <Loader2
                          size={12}
                          strokeWidth={1.75}
                          className='animate-spin'
                        />
                      ) : (
                        <X size={12} strokeWidth={1.75} />
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {allowEdit ? (
          <>
            <div className='row' style={{ gap: 6, alignItems: 'center' }}>
              <input
                type='text'
                className='field'
                placeholder='Add an item…'
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd(newLabel);
                  }
                }}
                maxLength={200}
                disabled={adding}
                style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}
              />
              <button
                type='button'
                className='btn btn-primary btn-sm'
                onClick={() => handleAdd(newLabel)}
                disabled={adding || !newLabel.trim()}
              >
                {adding ? (
                  <Loader2
                    size={13}
                    strokeWidth={1.75}
                    className='animate-spin'
                  />
                ) : (
                  <Plus size={13} strokeWidth={1.75} />
                )}
                Add
              </button>
            </div>

            {items.length === 0 ? (
              <div className='col' style={{ gap: 4 }}>
                <span
                  className='t-meta'
                  style={{ fontWeight: 600, marginTop: 4 }}
                >
                  Common items
                </span>
                <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
                  {COMMON_TEMPLATES.map((t) => (
                    <button
                      key={t}
                      type='button'
                      onClick={() => handleAdd(t)}
                      disabled={adding}
                      className='chip'
                      style={{ fontSize: 11 }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
