import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Performance Dashboard | Mintenance',
  description: 'Monitor Core Web Vitals and custom performance metrics for the Mintenance platform.',
};

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
