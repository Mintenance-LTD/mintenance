import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Time Tracking | Mintenance',
  description: 'Track your work hours, billable time, and earnings across all your maintenance jobs.',
};

export default function TimeTrackingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
