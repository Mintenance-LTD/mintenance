import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PortfolioWorkspace } from './portfolio-workspace';

export const metadata: Metadata = {
  title: 'Portfolio | Mintenance',
  description: 'Manage portfolio maintenance tickets across your properties.',
};

export default async function PortfolioPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/portfolio');
  }

  if (user.role === 'contractor') {
    redirect('/contractor/portfolio');
  }

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
    user.email;

  return (
    <PortfolioWorkspace
      user={{
        id: user.id,
        name: displayName,
        email: user.email,
      }}
    />
  );
}
