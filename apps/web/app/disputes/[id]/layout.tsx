import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dispute Details | Mintenance',
  description: 'View dispute status, timeline, and details for your property maintenance job.',
};

export default function DisputeDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
