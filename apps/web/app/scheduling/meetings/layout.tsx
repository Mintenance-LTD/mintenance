import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meetings | Mintenance',
  description: 'Schedule and manage site visits and consultations with contractors.',
};

export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
