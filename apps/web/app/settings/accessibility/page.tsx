/**
 * /settings/accessibility — Silver-mode toggle + future accessibility
 * preferences.
 *
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md.
 *
 * Wrapped in <HomeownerPageWrapper className='me-legacy-fit'> so the
 * Mint Editorial sidebar + topbar persist when users navigate from
 * /settings into this sub-page. Without the wrapper the chrome
 * disappeared on every settings sub-page, which felt like jumping to
 * a different app. `me-legacy-fit` lets the existing Tailwind classes
 * keep working while having mint-tinted background colors picked up
 * from the override layer in mint-editorial.css.
 */

import type { Metadata } from 'next';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { AccessibilitySettingsForm } from './components/AccessibilitySettingsForm';

export const metadata: Metadata = {
  title: 'Accessibility | Mintenance',
};

export default function AccessibilitySettingsPage() {
  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <header className='mb-8'>
          <h1 className='text-2xl font-bold text-gray-900'>Accessibility</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Make Mintenance easier to read and tap. Changes apply across this
            browser and your mobile app once you sign in.
          </p>
        </header>
        <AccessibilitySettingsForm />
      </div>
    </HomeownerPageWrapper>
  );
}
