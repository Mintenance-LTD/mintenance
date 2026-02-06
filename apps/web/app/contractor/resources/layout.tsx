import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learning Resources | Mintenance',
  description: 'Access guides, tips, and best practices to grow your contracting business on Mintenance.',
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
