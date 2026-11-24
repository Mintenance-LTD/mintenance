import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { VisitDetail } from '@/components/scheduling/VisitDetail';
import { readVisitForPage } from '@/lib/queries/visit-page';

export const metadata = { title: 'Visit details | Mintenance' };

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const visit = await readVisitForPage((await params).id, 'homeowner');
  return (
    <HomeownerPageWrapper>
      <VisitDetail visit={visit} role='homeowner' />
    </HomeownerPageWrapper>
  );
}
