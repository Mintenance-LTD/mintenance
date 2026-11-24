import { ContractorVisitDetails } from './ContractorVisitDetails';

export const metadata = { title: 'Visit details | Mintenance' };

export default async function AppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ContractorVisitDetails id={(await params).id} />;
}
