import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { readContractorPaymentRecord } from '@/lib/contractor/payment-record';
import { disputeHref } from '@/lib/disputes/presentation';
import { isValidUUID } from '@/lib/validation/uuid';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});
const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

export default async function ContractorPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUserFromCookies();
  if (user?.role !== 'contractor') redirect('/login');
  if (!isValidUUID(id)) notFound();

  const payment = await readContractorPaymentRecord(id, user.id);
  if (!payment) notFound();

  return (
    <ContractorPageWrapper>
      <div className='space-y-5'>
        <Link
          href={'/contractor/jobs/' + payment.jobId}
          className='t-meta underline'
        >
          View job
        </Link>
        <header>
          <h1 className='t-h1'>Payment details</h1>
          <p className='t-body'>{payment.jobTitle}</p>
          <p className='t-meta'>Payment reference {payment.id}</p>
        </header>
        <div className='card card-pad space-y-2'>
          <p className='t-body'>
            Customer payment {gbp.format(Number(payment.amount))}
          </p>
          {payment.contractorAmount != null && (
            <p className='t-body'>
              Recorded contractor amount{' '}
              {gbp.format(Number(payment.contractorAmount))}
            </p>
          )}
          {payment.status === 'disputed' && (
            <Link href={disputeHref(payment.id)} className='t-meta underline'>
              View dispute
            </Link>
          )}
        </div>
        <ol className='card card-pad divide-y' aria-label='Payment timeline'>
          {payment.steps.map(({ label, detail, at }) => (
            <li key={label} className='py-3'>
              <h2 className='t-h3'>{label}</h2>
              {at && (
                <time dateTime={at} className='t-meta'>
                  {dateFormat.format(new Date(at))} UK time
                </time>
              )}
              <p className='t-body'>{detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </ContractorPageWrapper>
  );
}
