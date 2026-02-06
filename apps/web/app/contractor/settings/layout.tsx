import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Mintenance',
  description: 'Manage your contractor account settings, profile, notifications, payments, and privacy preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
