import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AgencyWorkInbox } from './agency-work-inbox';

export const metadata: Metadata = { title: 'Agency work | Mintenance' };

export default async function AgencyWorkPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login?redirect=/agency-work');
  if (user.role !== 'homeowner' && user.role !== 'contractor')
    redirect('/dashboard');
  return (
    <AgencyWorkInbox
      viewer={user.role === 'contractor' ? 'contractor' : 'landlord'}
    />
  );
}
