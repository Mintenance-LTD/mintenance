import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { JobScheduling } from '../components/JobScheduling';

export const metadata = { title: 'Change job schedule | Mintenance' };

export default async function JobSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login');
  const { id } = await params;
  const { data: job, error } = await serverSupabase
    .from('jobs')
    .select(
      'id,title,homeowner_id,payer_user_id,contractor_id,status,scheduled_start_date,scheduled_end_date,scheduled_duration_hours'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Unable to load this schedule');
  if (
    !job ||
    ![job.homeowner_id, job.payer_user_id, job.contractor_id].includes(user.id)
  )
    notFound();
  const { data: contract, error: contractError } = await serverSupabase
    .from('contracts')
    .select('status')
    .eq('job_id', id)
    .neq('status', 'cancelled')
    .maybeSingle();
  if (contractError) throw new Error('Unable to verify the agreement');
  return (
    <main className='max-w-3xl mx-auto p-6'>
      <Link
        href={
          user.role === 'contractor' ? `/contractor/jobs/${id}` : `/jobs/${id}`
        }
      >
        Back to job
      </Link>
      <h1 className='text-2xl font-semibold my-4'>
        Change schedule: {job.title}
      </h1>
      {['completed', 'cancelled'].includes(job.status) ? (
        <p>This job is closed and its schedule cannot be changed.</p>
      ) : (
        <JobScheduling
          key={id}
          jobId={id}
          userId={user.id}
          userRole={job.contractor_id === user.id ? 'contractor' : 'homeowner'}
          contractStatus={
            contract?.status === 'accepted'
              ? 'accepted'
              : contract
                ? 'pending'
                : 'none'
          }
          currentSchedule={job}
          initialEditing
        />
      )}
    </main>
  );
}
