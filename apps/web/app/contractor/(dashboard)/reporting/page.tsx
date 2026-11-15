import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  collectReportRows,
  contractorReport,
  reportingPeriod,
} from '@/lib/contractor/reporting';
import { ReportingDashboard2025Client } from './components/ReportingDashboard2025Client';
export const metadata: Metadata = { title: 'Business analytics | Mintenance' };
export default async function ContractorReportingPage2025({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUserFromCookies();
  if (!user || user.role !== 'contractor') redirect('/login');
  const period = reportingPeriod((await searchParams).period);
  const [jobs, bids, payments, reviews] = await Promise.all([
    collectReportRows((from, to) =>
      serverSupabase
        .from('jobs')
        .select(
          'id, category, status, homeowner_id, created_at, homeowner:profiles!homeowner_id(first_name,last_name)'
        )
        .eq('contractor_id', user.id)
        .order('id')
        .range(from, to)
    ),
    collectReportRows((from, to) =>
      serverSupabase
        .from('bids')
        .select('id,status,created_at')
        .eq('contractor_id', user.id)
        .order('id')
        .range(from, to)
    ),
    collectReportRows((from, to) =>
      serverSupabase
        .from('escrow_transactions')
        .select('id,job_id,amount,contractor_payout,platform_fee,released_at')
        .eq('payee_id', user.id)
        .in('status', ['released', 'completed'])
        .order('id')
        .range(from, to)
    ),
    collectReportRows((from, to) =>
      serverSupabase
        .from('reviews')
        .select('id,rating,created_at')
        .eq('reviewee_id', user.id)
        .order('id')
        .range(from, to)
    ),
  ]);
  const now = new Date();
  return (
    <ReportingDashboard2025Client
      analytics={contractorReport(
        { jobs, bids, payments, reviews },
        period,
        now
      )}
      period={period}
      generatedAt={now.toISOString()}
    />
  );
}
