import type { Metadata } from 'next';
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

  const [{ data: properties }, { data: tokens }, coverageResult, cookieStore] =
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

  if (isMintEditorial) {
    return (
      <MintEditorialReportingLinks
        properties={properties || []}
        tokens={tokens || []}
        coverage={coverage}
      />
    );
  }

  return (
    <ReportingLinksClient
      properties={properties || []}
      tokens={tokens || []}
      coverage={coverage}
    />
  );
}
