import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ReportingLinksClient } from './ReportingLinksClient';
import { MintEditorialReportingLinks } from './MintEditorialReportingLinks';
import type { ReportingCoverage } from './ReportingLinkCoverage';
import type { EmergencyCoverageRow } from '@/app/maintenance/emergencies/EmergencyCoverage';

export const metadata: Metadata = {
  title: 'Reporting Links | Mintenance',
  description:
    'Manage maintenance reporting links that need no tenant account for your properties.',
};

export default async function ReportingLinksPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/landlord/reporting-links');
  }
  if (user.role !== 'homeowner' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  const [propertyResult, tokenResult, coverageResult, cookieStore] =
    await Promise.all([
      serverSupabase
        .from('properties')
        .select('id, property_name, address')
        .eq('owner_id', user.id)
        .order('property_name'),
      serverSupabase
        .from('anonymous_report_tokens')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      serverSupabase.rpc('emergency_report_coverage', { p_actor: user.id }),
      cookies(),
    ]);
  if (propertyResult.error || tokenResult.error) {
    return (
      <main className='mx-auto max-w-3xl space-y-3 p-6'>
        <h1 className='text-2xl font-semibold'>Reporting links</h1>
        <p role='alert'>Reporting links could not be loaded. Please retry.</p>
        <a className='underline' href='/landlord/reporting-links'>
          Retry reporting links
        </a>
        <Link className='block underline' href='/properties'>
          Open properties
        </Link>
      </main>
    );
  }
  const properties = propertyResult.data ?? [];
  const tokens = tokenResult.data ?? [];
  const coverage: ReportingCoverage | null =
    !coverageResult.error && Array.isArray(coverageResult.data)
      ? (coverageResult.data as EmergencyCoverageRow[]).map((row) => ({
          propertyId: row.property_id,
          hasEmergencyPhone: !!row.emergency_phone,
          hasFallbackResponder: !!row.fallback_responder,
        }))
      : null;

  const isMintEditorial =
    cookieStore.get('mintenance-theme')?.value === 'mint-editorial';

  const ReportingLinks = isMintEditorial
    ? MintEditorialReportingLinks
    : ReportingLinksClient;
  return (
    <>
      <aside aria-label='Reporting link scope' className='m-6 text-sm'>
        <p>
          This page lists your own reporting links. For a property shared with
          you, open that property to find its reporting controls if your role
          allows it.
        </p>
        <Link
          className='mt-2 inline-block font-semibold underline'
          href='/properties'
        >
          Open properties
        </Link>
      </aside>
      <ReportingLinks
        properties={properties}
        tokens={tokens}
        coverage={coverage}
      />
    </>
  );
}
