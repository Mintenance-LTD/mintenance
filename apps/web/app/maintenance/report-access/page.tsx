import { ReportAccess } from './ReportAccess';
export const metadata = {
  title: 'Access your maintenance report',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function Page() {
  return (
    <main className='mx-auto max-w-xl space-y-5 p-6'>
      <h1 className='text-2xl font-semibold'>Access your maintenance report</h1>
      <ReportAccess />
    </main>
  );
}
