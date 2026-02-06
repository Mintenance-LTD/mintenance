import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline | Mintenance',
  description: 'You are currently offline. Check your internet connection and try again.',
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
