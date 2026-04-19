/**
 * /settings/accessibility — Silver-mode toggle + future accessibility
 * preferences.
 *
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md.
 */

import type { Metadata } from 'next';
import { AccessibilitySettingsForm } from './components/AccessibilitySettingsForm';

export const metadata: Metadata = {
  title: 'Accessibility | Mintenance',
};

export default function AccessibilitySettingsPage() {
  return (
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
  );
}
