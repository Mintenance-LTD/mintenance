import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { TenantReportsClient } from './TenantReportsClient';
import { MintEditorialTenantReports } from './MintEditorialTenantReports';

export const metadata: Metadata = {
  title: 'Tenant Reports | Mintenance',
  description: 'View and manage maintenance reports submitted by tenants.',
};

function ReportInboxNavigation() {
  return (
    <aside aria-label='Tenant report inbox scope' className='m-6 text-sm'>
      <p>
        This inbox shows reports from links you own. To pick up work on
        properties shared with you, use the maintenance action queue.
      </p>
      <div className='mt-2 flex flex-wrap gap-4'>
        <Link className='font-semibold underline' href='/properties/work-queue'>
          Open team action queue
        </Link>
        <Link
          className='font-semibold text-red-700 underline'
          href='/maintenance/emergencies'
        >
          Review emergency acknowledgments
        </Link>
      </div>
    </aside>
  );
}

export default async function TenantReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ reportId?: string | string[] }>;
}) {
  const query = await searchParams;
  const initialReportId =
    typeof query.reportId === 'string' ? query.reportId : undefined;
  const user = await getCurrentUserFromCookies();

  if (!user) {
    const returnTo = initialReportId
      ? `/landlord/reports?reportId=${encodeURIComponent(initialReportId)}`
      : '/landlord/reports';
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  }
  if (user.role !== 'homeowner' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all anonymous reports for this owner's properties
  const { data: reports, error } = await serverSupabase
    .from('anonymous_reports')
    .select(
      `
      *,
      anonymous_report_tokens!inner (owner_id, label, property_id),
      properties:property_id (id, property_name, address)
    `
    )
    .eq('anonymous_report_tokens.owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error)
    return (
      <main className='mx-auto max-w-3xl p-6'>
        <h1 className='text-2xl font-semibold'>Tenant reports</h1>
        <p role='alert'>
          Reports could not be loaded. Your inbox has not been confirmed empty.
        </p>
        <ReportInboxNavigation />
        <a
          className='underline'
          href={
            initialReportId
              ? `/landlord/reports?reportId=${encodeURIComponent(initialReportId)}`
              : '/landlord/reports'
          }
        >
          Retry reports
        </a>
      </main>
    );

  // Phase-2 design rebrand. Server-side cookie check picks the
  // canonical Mint Editorial layout when the homeowner has opted in
  // via Settings → Appearance. Both branches consume the same data.
  const cookieStore = await cookies();
  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  if (isMintEditorial) {
    return (
      <>
        <ReportInboxNavigation />
        <MintEditorialTenantReports
          key={initialReportId ?? 'inbox'}
          reports={reports || []}
          initialReportId={initialReportId}
        />
      </>
    );
  }

  return (
    <>
      <ReportInboxNavigation />
      <TenantReportsClient
        key={initialReportId ?? 'inbox'}
        reports={reports || []}
        initialReportId={initialReportId}
      />
    </>
  );
}
