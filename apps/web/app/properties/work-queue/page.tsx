'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FollowupForm } from './FollowupForm';
import { PortfolioReport } from './PortfolioReport';
import { OperationsPage } from '@/components/property-operations/OperationsPage';
import styles from '@/components/property-operations/operations.module.css';
import { ClipboardList, ArrowRight, Clock3 } from 'lucide-react';

interface Item {
  id: string;
  kind: string;
  urgency: number;
  property_id: string;
  property_name: string;
  title: string;
  status: string;
  next_action: string;
  due_at: string | null;
  due_label?: string;
  can_open_job: boolean;
  can_manage_followup: boolean;
  assigned_to: string | null;
  assignee_name: string | null;
  assignment_status: 'assigned' | 'unassigned' | 'needs_reassignment';
}
interface Queue {
  properties?: { id: string; name: string }[];
  items: Item[];
  total: number;
  overdue: number;
  hasMore: boolean;
  scope: string;
}

export default function PropertyWorkQueuePage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<Queue | null>(null);
  const [error, setError] = useState('');
  const [scope, setScope] = useState('team');
  const [filters, setFilters] = useState({
    property: '',
    priority: '',
    person: '',
    sort: 'priority',
  });
  const [personDraft, setPersonDraft] = useState('');
  const [properties, setProperties] = useState<{ id: string; name: string }[]>(
    []
  );
  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setOffset(0);
    setEditing(null);
    setData(null);
  };
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    const timeout = setTimeout(() => {
      controller.abort();
      setError('Loading took too long. Please retry.');
    }, 15000);
    const params = new URLSearchParams({
      offset: String(offset),
      limit: '25',
      scope,
    });
    for (const [key, value] of Object.entries(filters))
      if (value) params.set(key, value);
    fetch('/api/portfolio/queue?' + params, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? 'Sign in again to view your queue.'
              : 'Unable to load your queue. Please retry.'
          );
        return response.json() as Promise<Queue>;
      })
      .then((value) => {
        if (controller.signal.aborted) return;
        if (
          value?.scope !== scope ||
          !Array.isArray(value.items) ||
          typeof value.total !== 'number' ||
          typeof value.hasMore !== 'boolean'
        )
          throw new Error(
            'Your selected queue could not be confirmed. Please retry.'
          );
        setData(value);
        setProperties(value.properties ?? []);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [offset, attempt, scope, filters]);
  return (
    <OperationsPage
      compact
      title='Maintenance action queue'
      eyebrow='Your property to-do list'
      backHref='/properties'
      backLabel='Back to properties'
      description='Review priority work and manage follow-ups across your properties.'
    >
      <details className={styles.queueHelp}>
        <summary>How the queue works</summary>
        <p>
          Review opens the job or property. Manage follow-up assigns
          responsibility and records updates. Maintenance and renewals cover the
          next 30 days.
        </p>
      </details>
      <label className='block my-4 font-medium'>
        Team queue{' '}
        <select
          className='min-h-12 rounded border px-3'
          value={scope}
          onChange={(event) => {
            setScope(event.target.value);
            setOffset(0);
            setEditing(null);
            setData(null);
            setError('');
          }}
        >
          <option value='team'>Team — all accessible actions</option>
          <option value='mine'>Mine</option>
          <option value='unassigned'>Unassigned</option>
        </select>
      </label>
      <p className='text-sm text-slate-600 mb-4'>
        Mine shows follow-ups assigned to you. Unassigned includes items needing
        reassignment. Property access still applies to every view.
      </p>
      <div className='flex flex-wrap gap-4 mb-5'>
        <label>
          Property
          <select
            className='block min-h-11 rounded border p-2'
            value={filters.property}
            onChange={(event) => updateFilter('property', event.target.value)}
          >
            <option value=''>All accessible properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select
            className='block min-h-11 rounded border p-2'
            value={filters.priority}
            onChange={(event) => updateFilter('priority', event.target.value)}
          >
            <option value=''>All priorities</option>
            <option value='0'>Priority / overdue</option>
            <option value='1'>Needs attention</option>
            <option value='2'>Upcoming / routine</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            className='block min-h-11 rounded border p-2'
            value={filters.sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
          >
            <option value='priority'>Priority, then due date</option>
            <option value='due'>Due date</option>
            <option value='property'>Property</option>
            <option value='person'>Responsible person</option>
          </select>
        </label>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateFilter('person', personDraft.trim());
          }}
        >
          <label>
            Responsible person
            <input
              className='block min-h-11 rounded border p-2'
              type='search'
              maxLength={100}
              value={personDraft}
              onChange={(event) => setPersonDraft(event.target.value)}
            />
          </label>
          <button type='submit' className='underline'>
            Apply person filter
          </button>
        </form>
      </div>
      {error ? (
        <div role='alert' className={styles.error}>
          {error}{' '}
          <button
            onClick={() => setAttempt((value) => value + 1)}
            className='underline'
          >
            Retry
          </button>
        </div>
      ) : !data ? (
        <p role='status'>Loading your queue…</p>
      ) : (
        <>
          <div className={styles.queueStats}>
            <div className={styles.queueStat}>
              <p className='text-sm text-slate-600'>Actions in this queue</p>
              <strong>{data.total}</strong>
            </div>
            <div className={styles.queueStat}>
              <p className='text-sm text-teal-900'>
                Priority actions in this queue
              </p>
              <strong>{data.overdue}</strong>
            </div>
          </div>
          {data.items.length === 0 ? (
            <div className={styles.empty}>
              <h2 className='text-xl font-semibold'>
                Nothing waiting on this page
              </h2>
              <p className='mt-2 text-slate-600'>
                {scope === 'mine'
                  ? 'No follow-ups are assigned to you on this page. Check Team for other accessible work.'
                  : scope === 'unassigned'
                    ? 'No unassigned follow-ups on this page.'
                    : 'New reports, maintenance and renewals will appear here when they need attention.'}
              </p>
            </div>
          ) : (
            <ul className={styles.queueList}>
              {data.items.map((item) => (
                <li key={`${item.kind}:${item.id}`} className={styles.queueRow}>
                  <div className={styles.cardTop}>
                    <span className={styles.icon}>
                      <ClipboardList size={22} />
                    </span>
                    <div className={styles.content}>
                      <p className={styles.meta}>
                        {item.property_name} · {item.kind} ·{' '}
                        {item.urgency === 0
                          ? 'Priority / overdue'
                          : item.urgency === 1
                            ? 'Needs attention'
                            : 'Upcoming / routine'}
                      </p>
                      <h2>{item.title}</h2>
                    </div>
                  </div>
                  <p className='text-sm text-slate-700'>
                    Responsible:{' '}
                    {item.assignment_status === 'needs_reassignment'
                      ? 'Needs reassignment'
                      : item.assignee_name || 'Unassigned'}
                  </p>
                  <div className={styles.next}>
                    <Clock3 size={16} />
                    <strong>
                      {item.kind === 'job' &&
                      item.status === 'assigned' &&
                      !item.next_action.startsWith('Awaiting ')
                        ? 'View schedule and current next steps'
                        : item.next_action}
                    </strong>
                    {item.due_at && (
                      <span>
                        {' '}
                        · {item.due_label || 'Due / follow-up'}:{' '}
                        {new Date(item.due_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'Europe/London',
                        })}
                      </span>
                    )}
                  </div>
                  <div className={styles.actions}>
                    <Link
                      className={styles.primary}
                      href={
                        item.kind === 'job' && item.can_open_job
                          ? `/jobs/${item.id}`
                          : item.kind === 'report'
                            ? `/maintenance/reports/${item.id}`
                            : `/properties/${item.property_id}`
                      }
                    >
                      Review {item.kind}
                      <ArrowRight size={16} />
                    </Link>
                    {item.can_manage_followup === true ? (
                      <button
                        className={styles.secondary}
                        aria-expanded={editing === `${item.kind}:${item.id}`}
                        onClick={() =>
                          setEditing(
                            editing === `${item.kind}:${item.id}`
                              ? null
                              : `${item.kind}:${item.id}`
                          )
                        }
                      >
                        Manage follow-up
                      </button>
                    ) : (
                      <span className='text-sm text-slate-600'>
                        View only — ask the property owner or manager to update
                        the follow-up.
                      </span>
                    )}
                  </div>
                  {item.can_manage_followup === true &&
                    editing === `${item.kind}:${item.id}` && (
                      <div className={styles.queueFollowup}>
                        <FollowupForm
                          propertyId={item.property_id}
                          kind={item.kind}
                          sourceId={item.id}
                          onSaved={() => setAttempt((value) => value + 1)}
                        />
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
          <nav aria-label='Queue pages' className='flex items-center gap-4'>
            <button
              disabled={offset === 0}
              onClick={() => setOffset((value) => Math.max(0, value - 25))}
              className={styles.secondary}
            >
              Previous
            </button>
            <span>Page {Math.floor(offset / 25) + 1}</span>
            <button
              disabled={!data.hasMore}
              onClick={() => setOffset((value) => value + 25)}
              className={styles.secondary}
            >
              Next
            </button>
          </nav>
        </>
      )}
      <details className={styles.report}>
        <summary>Portfolio reporting and export</summary>
        <PortfolioReport />
      </details>
    </OperationsPage>
  );
}
