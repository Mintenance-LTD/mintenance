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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const { from } = search;
  const origin =
    from === 'tenant-reports' || from === 'emergencies' ? from : 'action-queue';
  const queueParams = new URLSearchParams();
  if (from === 'action-queue') {
    for (const [name, value] of Object.entries(search)) {
      if (typeof value === 'string') queueParams.set(name, value);
    }
  }
  return (
    <main className='mx-auto max-w-2xl p-6'>
      <ReportConversation
        reportId={id}
        origin={origin}
        queueSearch={
          from === 'action-queue' ? queueParams.toString() : undefined
        }
      />
    </main>
  );
}
