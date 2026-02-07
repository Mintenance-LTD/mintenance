import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contractor Network | Mintenance',
  description: 'Connect with other contractors, share your work, and get inspired on the Mintenance social feed.',
};

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
