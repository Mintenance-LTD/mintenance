import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EmergencyReportsClient } from './EmergencyReportsClient';

export const metadata = { title: 'Emergency reports | Mintenance' };

export default async function EmergencyReportsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login?redirect=%2Fmaintenance%2Femergencies');
  const { data, error } = await serverSupabase.rpc('emergency_report_inbox', {
    p_actor: user.id,
  });
  if (error)
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <h1 className='text-2xl font-semibold'>Emergency reports</h1>
        <p role='alert'>
          The emergency inbox could not be loaded. It has not been confirmed
          empty.
        </p>
        <a href='/maintenance/emergencies' className='underline'>
          Retry emergency inbox
        </a>
      </main>
    );
  return <EmergencyReportsClient initialReports={data ?? []} />;
}
