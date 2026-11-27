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
  searchParams: Promise<{ orgId?: string; ticketId?: string; view?: string }>;
}) {
  const target = await searchParams;
  const crm = target.view === 'crm';
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
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect(
      crm
        ? '/login?redirect=' +
            encodeURIComponent(
              '/portfolio?' +
                new URLSearchParams({
                  view: 'crm',
                  ...(targetOrgId ? { orgId: targetOrgId } : {}),
                }).toString()
            )
        : '/login?redirect=/portfolio'
    );
  }

  if (user.role === 'contractor') {
    redirect('/contractor/portfolio');
  }

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
    user.email;

  return (
    <PortfolioWorkspace
      crm={crm}
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
