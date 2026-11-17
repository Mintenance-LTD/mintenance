import { AdminDisputeCase } from '../components/AdminDisputeCase';

export default async function DisputeCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminDisputeCase escrowId={id} />;
}
