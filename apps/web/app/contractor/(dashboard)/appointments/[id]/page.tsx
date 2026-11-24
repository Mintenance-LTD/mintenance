import { VisitDetail } from '@/components/scheduling/VisitDetail';
import { readVisitForPage } from '@/lib/queries/visit-page';

export const metadata = { title: 'Visit details | Mintenance' };

export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const visit = await readVisitForPage((await params).id, 'contractor');
  return <VisitDetail visit={visit} role='contractor' />;
}
