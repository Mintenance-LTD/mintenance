import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { PortfolioWorkspace } from './portfolio-workspace';

export const metadata: Metadata = {
  title: 'Portfolio | Mintenance',
  description: 'Manage portfolio maintenance tickets across your properties.',
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; ticketId?: string }>;
}) {
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

  const target = await searchParams;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const targetOrgId =
    typeof target.orgId === 'string' && uuid.test(target.orgId)
      ? target.orgId
      : undefined;
  const targetTicketId =
    typeof target.ticketId === 'string' && uuid.test(target.ticketId)
      ? target.ticketId
      : undefined;
  return (
    <PortfolioWorkspace
      targetOrgId={targetOrgId}
      targetTicketId={targetTicketId}
      user={{
        id: user.id,
        name: displayName,
        email: user.email,
      }}
    />
  );
}
