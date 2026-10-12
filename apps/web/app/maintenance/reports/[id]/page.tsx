import { ReportConversation } from '../ReportConversation';
export const metadata = {
  title: 'Maintenance conversation',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className='mx-auto max-w-2xl p-6'>
      <ReportConversation reportId={id} />
    </main>
  );
}
