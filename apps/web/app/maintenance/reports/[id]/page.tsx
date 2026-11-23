import { ReportConversation } from '../ReportConversation';
export const metadata = {
  title: 'Maintenance conversation',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const origin =
    from === 'tenant-reports' || from === 'emergencies' ? from : 'action-queue';
  return (
    <main className='mx-auto max-w-2xl p-6'>
      <ReportConversation reportId={id} origin={origin} />
    </main>
  );
}
