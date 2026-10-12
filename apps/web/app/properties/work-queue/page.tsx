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
  property_id: string;
  property_name: string;
  title: string;
  status: string;
  next_action: string;
  due_at: string | null;
  can_open_job: boolean;
}
interface Queue {
  items: Item[];
  total: number;
  overdue: number;
  hasMore: boolean;
}

export default function PropertyWorkQueuePage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<Queue | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    fetch(`/api/portfolio/queue?offset=${offset}&limit=25`, {
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
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [offset, attempt]);
  return (
    <OperationsPage
      title='Maintenance action queue'
      eyebrow='Your property to-do list'
      backHref='/properties'
      backLabel='Back to properties'
      description='See what needs attention across your properties. Review the work, choose the next step, and keep your team up to date.'
    >
      <div className={styles.note}>
        Start with the priority items below. <strong>Review</strong> opens the
        related job or property; <strong>Manage follow-up</strong> lets you
        assign responsibility, set a due date and record an update. Maintenance
        and certificate renewals cover the next 30 days.
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
          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className='text-sm text-slate-600'>Open actions</p>
              <strong>{data.total}</strong>
            </div>
            <div className={styles.stat}>
              <p className='text-sm text-teal-900'>Priority actions</p>
              <strong>{data.overdue}</strong>
            </div>
          </div>
          {data.items.length === 0 ? (
            <div className={styles.empty}>
              <h2 className='text-xl font-semibold'>
                Nothing waiting on this page
              </h2>
              <p className='mt-2 text-slate-600'>
                New reports, maintenance and renewals will appear here when they
                need attention.
              </p>
            </div>
          ) : (
            <ul className={styles.list}>
              {data.items.map((item) => (
                <li key={`${item.kind}:${item.id}`} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.icon}>
                      <ClipboardList size={22} />
                    </span>
                    <div className={styles.content}>
                      <p className={styles.meta}>
                        {item.property_name} · {item.kind}
                      </p>
                      <h2>{item.title}</h2>
                    </div>
                  </div>
                  <div className={styles.next}>
                    <Clock3 size={16} />
                    <strong>{item.next_action}</strong>
                    {item.due_at && (
                      <span>
                        {' '}
                        ·{' '}
                        {new Date(item.due_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
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
                            ? '/landlord/reports'
                            : `/properties/${item.property_id}`
                      }
                    >
                      Review {item.kind}
                      <ArrowRight size={16} />
                    </Link>
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
                  </div>
                  {editing === `${item.kind}:${item.id}` && (
                    <FollowupForm
                      propertyId={item.property_id}
                      kind={item.kind}
                      sourceId={item.id}
                      onSaved={() => setAttempt((value) => value + 1)}
                    />
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
