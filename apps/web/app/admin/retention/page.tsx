/**
 * /admin/retention — future home of the 5 retention-dashboard views
 * (homeowner cohort retention, contractor GMV retention, escrow loop
 * completion, silent-drop rate, trust incident log) per
 * docs/RETENTION_ROADMAP_2026.md §6.
 *
 * R1 ships only the push-token coverage widget. The other four slots are
 * scaffolded as placeholders so R2/R3 work can drop components in
 * without touching the layout.
 */

import type { Metadata } from 'next';
import { PushTokenCoverage } from './components/PushTokenCoverage';
import { AdminCard } from '@/components/admin/AdminCard';

export const metadata: Metadata = {
  title: 'Retention Dashboard | Mintenance Admin',
};

const PLACEHOLDERS = [
  {
    title: 'Homeowner cohort retention',
    note: 'W+13 / W+26 / W+52 activity per cohort. Materialised view lands in R2.',
  },
  {
    title: 'Contractor GMV retention',
    note: 'M+12 GMV vs M0 per contractor. Materialised view lands in R2.',
  },
  {
    title: 'Escrow loop completion',
    note: '% funded escrow → released within 14 days. Weekly trend.',
  },
  {
    title: 'Notification silent-drop rate',
    note: 'Per canonical event; requires canonical_events table (R2 prerequisite).',
  },
  {
    title: 'Trust incident log',
    note: 'Disputes + advisor alerts, last 90 days.',
  },
];

export default function RetentionDashboardPage() {
  return (
    <div className='p-6 space-y-6 max-w-7xl'>
      <header>
        <h1 className='text-2xl font-bold text-gray-900'>Retention</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Weekly north-star view per{' '}
          <a
            href='/docs/RETENTION_ROADMAP_2026.md'
            className='underline'
            target='_blank'
            rel='noreferrer'
          >
            Retention Roadmap
          </a>
          . R1 ships push-token coverage; remaining tiles populate across R2–R3.
        </p>
      </header>

      <PushTokenCoverage />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {PLACEHOLDERS.map((p) => (
          <AdminCard key={p.title}>
            <h3 className='font-semibold text-gray-900 mb-1'>{p.title}</h3>
            <p className='text-sm text-gray-500'>{p.note}</p>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
