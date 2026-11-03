import { getCurrentUserFromCookies } from '@/lib/auth';
import { SupportInbox } from '@/components/support/SupportInbox';
export const metadata = { title: 'Customer support | Mintenance' };
export default async function SupportPage() {
  const user = await getCurrentUserFromCookies();
  return (
    <main className='mx-auto max-w-5xl p-6 py-12'>
      <h1 className='text-3xl font-semibold mb-4'>Mintenance support</h1>
      <p className='mb-4'>
        Ask about your account, a job or a payment. This inbox is monitored
        periodically during beta; it is not a live emergency service. For
        immediate danger, contact the emergency services.
      </p>
      <p className='mb-8'>
        You can also email{' '}
        <a href='mailto:admin@mintenance.co.uk'>admin@mintenance.co.uk</a>.
        Include your case or job reference.{' '}
        <a href='/terms'>
          Read the customer terms and cancellation information.
        </a>
      </p>
      <SupportInbox signedIn={!!user && user.role !== 'admin'} />
    </main>
  );
}
