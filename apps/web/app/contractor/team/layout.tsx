import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Management | Mintenance',
  description: 'Manage your team members, roles, and permissions. Add technicians and manage access on Mintenance.',
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
