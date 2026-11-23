import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EmergencyReportsClient } from './EmergencyReportsClient';
import type { EmergencyCoverageRow } from './EmergencyCoverage';

export const metadata = { title: 'Emergency reports | Mintenance' };

export default async function EmergencyReportsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect('/login?redirect=%2Fmaintenance%2Femergencies');
  const [inbox, coverage] = await Promise.all([
    serverSupabase.rpc('emergency_report_inbox', { p_actor: user.id }),
    serverSupabase.rpc('emergency_report_coverage', { p_actor: user.id }),
  ]);

  return (
    <EmergencyReportsClient
      initialReports={
        !inbox.error && Array.isArray(inbox.data) ? inbox.data : null
      }
      coverage={
        !coverage.error && Array.isArray(coverage.data)
          ? (coverage.data as EmergencyCoverageRow[])
          : null
      }
    />
  );
}
