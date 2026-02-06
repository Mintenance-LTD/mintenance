import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics & Insights | Mintenance',
  description: 'Track your spending, project trends, and maintenance analytics across all your properties.',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
