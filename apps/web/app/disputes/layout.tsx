import type { ReactNode } from 'react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { ContractorAccountShell } from '@/app/contractor/components/ContractorAccountShell';
import { getCurrentUserFromCookies } from '@/lib/auth';

/** Choose navigation by account role; dispute access stays with the page/API. */
export default async function DisputesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUserFromCookies();
  if (user?.role === 'contractor') {
    return (
      <ContractorAccountShell authUser={user}>
        {children}
      </ContractorAccountShell>
    );
  }
  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      {children}
    </HomeownerPageWrapper>
  );
}
