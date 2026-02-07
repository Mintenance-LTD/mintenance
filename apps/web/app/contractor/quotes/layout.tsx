import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quotes | Mintenance',
  description: 'Manage your quotes and proposals. Create, send, and track quotes for maintenance jobs.',
};

export default function QuotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
