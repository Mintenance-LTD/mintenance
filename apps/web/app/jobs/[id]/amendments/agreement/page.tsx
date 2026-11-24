import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from '@/lib/validation/uuid';
import { ContractManagement } from '../../components/ContractManagement';

export default async function RevisedAgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    contract?: string | string[];
    quote?: string | string[];
    version?: string | string[];
  }>;
}) {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login');
  const [{ id }, { contract, quote, version }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (
    !isValidUUID(id) ||
    typeof contract !== 'string' ||
    !isValidUUID(contract) ||
    typeof quote !== 'string' ||
    !isValidUUID(quote) ||
    typeof version !== 'string' ||
    !/^[1-9]\d*$/.test(version) ||
    !Number.isSafeInteger(Number(version))
  )
    notFound();

  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select('homeowner_id, payer_user_id, contractor_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Could not load the revised agreement');
  if (
    !job ||
    ![job.homeowner_id, job.payer_user_id, job.contractor_id].includes(user.id)
  )
    notFound();

  return (
    <main className='mx-auto max-w-4xl space-y-4 p-5 sm:p-8'>
      <Link
        className='inline-block text-sm underline underline-offset-4'
        href={`/jobs/${id}/amendments`}
      >
        Back to quote amendments
      </Link>
      <h1 className='text-2xl font-semibold'>Review revised contract</h1>
      <ContractManagement
        key={`${id}:${contract}:${quote}:${version}`}
        jobId={id}
        userId={user.id}
        userRole={user.role === 'contractor' ? 'contractor' : 'homeowner'}
        revision={{ id: contract, quoteId: quote, version: Number(version) }}
      />
    </main>
  );
}
