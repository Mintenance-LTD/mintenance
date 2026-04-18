/**
 * /homeowner/subscriptions/home-health — enroll in Home Health.
 * R5 #2 of docs/RETENTION_ROADMAP_2026.md.
 */

import type { Metadata } from 'next';
import { HomeHealthEnrollCard } from './components/HomeHealthEnrollCard';

export const metadata: Metadata = {
  title: 'Home Health | Mintenance',
};

export default function HomeHealthPage() {
  return (
    <div className='max-w-3xl mx-auto px-6 py-10'>
      <header className='mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>Home Health</h1>
        <p className='text-sm text-gray-600 mt-2 max-w-2xl'>
          £9.99/month. We auto-post three key maintenance jobs for your home
          each year: a boiler service, smoke-alarm check, and gutter clean. You
          choose the contractor each time — nothing auto-books without you.
        </p>
      </header>
      <HomeHealthEnrollCard />
    </div>
  );
}
