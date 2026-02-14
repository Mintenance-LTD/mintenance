import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { TenantReportsClient } from './TenantReportsClient';

export const metadata: Metadata = {
  title: 'Tenant Reports | Mintenance',
  description: 'View and manage maintenance reports submitted by tenants.',
};

export default async function TenantReportsPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/landlord/reports');
  }
  if (user.role !== 'homeowner' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all anonymous reports for this owner's properties
  const { data: reports } = await serverSupabase
    .from('anonymous_reports')
    .select(`
      *,
      anonymous_report_tokens!inner (owner_id, label, property_id),
      properties:property_id (id, property_name, address)
    `)
    .eq('anonymous_report_tokens.owner_id', user.id)
    .order('created_at', { ascending: false });

  return <TenantReportsClient reports={reports || []} />;
}
