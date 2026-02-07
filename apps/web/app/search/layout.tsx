import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search | Mintenance',
  description: 'Search for maintenance jobs and verified contractors with advanced filters.',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
