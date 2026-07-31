'use client';

/**
 * Contractor-side "Pre-arrival checklist" card on
 * `/contractor/jobs/[id]`. Shows the items the homeowner set on
 * `/jobs/[id]` (or the corresponding mobile screen) and lets the
 * contractor tick / untick each one.
 *
 * Backed by:
 *   - migration 20260520000004_job_checklists.sql
 *   - /api/jobs/[id]/checklist/route.ts  (GET)
 *   - /api/jobs/[id]/checklist/[itemId]/route.ts (PATCH { completed })
 *
 * The homeowner can edit labels + add/remove items on their side;
 * the contractor only sees a read+tick view. Optimistic update on tick
 * keeps the UX snappy; failure rolls back + toasts.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

interface ChecklistItem {
  id: string;
  label: string;
  position: number;
  completed_at: string | null;
  completed_by: string | null;
}

interface PreArrivalChecklistProps {
  jobId: string;
}

export function PreArrivalChecklist({ jobId }: PreArrivalChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/checklist`, {
        credentials: 'include',
      });
      if (!res.ok) return; // silent — empty checklist is normal
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      logger.error('Error fetching checklist', err, { service: 'ui' });
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (item: ChecklistItem) => {
    if (togglingIds.has(item.id)) return;
    const previous = items;
    const wasCompleted = !!item.completed_at;
    const nowIso = wasCompleted ? null : new Date().toISOString();

    // Optimistic update
    setItems((prev) =>
      (prev || []).map((i) =>
        i.id === item.id ? { ...i, completed_at: nowIso } : i
      )
    );
    setTogglingIds((prev) => new Set(prev).add(item.id));

    try {
      const csrf = await getCsrfHeaders();
      const res = await fetch(`/api/jobs/${jobId}/checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrf },
        credentials: 'include',
        body: JSON.stringify({ completed: !wasCompleted }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(body.error || 'Failed to update checklist');
      }
    } catch (err) {
      logger.error('Error toggling checklist item', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to update checklist'
      );
      // Rollback
      setItems(previous);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Hide the card entirely when there's nothing to show.
  if (loading || !items || items.length === 0) return null;

  const completedCount = items.filter((i) => i.completed_at).length;

  return (
    <div className='card card-pad'>
      <div className='col' style={{ gap: 12 }}>
        <div className='between' style={{ alignItems: 'center' }}>
          <h3 className='t-h3' style={{ margin: 0 }}>
            Pre-arrival checklist
          </h3>
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
        </div>

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
            const toggling = togglingIds.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type='button'
                  onClick={() => handleToggle(item)}
                  disabled={toggling}
                  className='row'
                  style={{
                    gap: 10,
                    padding: '8px 10px',
                    background: 'transparent',
                    border: '1px solid var(--me-line)',
                    borderRadius: 8,
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 120ms ease',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--me-bg-2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  aria-pressed={done}
                  aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${item.label}`}
                >
                  {toggling ? (
                    <Loader2
                      size={16}
                      strokeWidth={1.75}
                      className='animate-spin'
                      style={{ color: 'var(--me-ink-3)' }}
                    />
                  ) : done ? (
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.75}
                      style={{
                        color: 'var(--me-ok)',
                        fill: 'var(--me-ok)',
                      }}
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
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
