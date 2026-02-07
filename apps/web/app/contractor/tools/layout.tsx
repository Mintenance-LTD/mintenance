import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tools & Equipment | Mintenance',
  description: 'Track and manage your tool inventory, maintenance schedules, and equipment value on Mintenance.',
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
