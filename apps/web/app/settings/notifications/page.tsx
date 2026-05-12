/**
 * /settings/notifications — user-facing notification-preferences page.
 * R2 from docs/RETENTION_ROADMAP_2026.md.
 *
 * Wrapped in <HomeownerPageWrapper className='me-legacy-fit'> to keep
 * the Mint Editorial chrome present when users navigate here from the
 * main /settings page. See /settings/accessibility for the same fix.
 */

import type { Metadata } from 'next';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { NotificationPreferencesForm } from './components/NotificationPreferencesForm';

export const metadata: Metadata = {
  title: 'Notification settings | Mintenance',
};

export default function NotificationSettingsPage() {
  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <header className='mb-8'>
          <h1 className='text-2xl font-bold text-gray-900'>
            Notification settings
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Choose how and when Mintenance reaches you.
          </p>
        </header>
        <NotificationPreferencesForm />
      </div>
    </HomeownerPageWrapper>
  );
}
