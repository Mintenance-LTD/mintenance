import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ReportingLinksClient } from './ReportingLinksClient';

export const metadata: Metadata = {
  title: 'Reporting Links | Mintenance',
  description: 'Manage anonymous maintenance reporting links for your properties.',
};

export default async function ReportingLinksPage() {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect('/login?redirect=/landlord/reporting-links');
  }
  if (user.role !== 'homeowner' && user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch properties
  const { data: properties } = await serverSupabase
    .from('properties')
    .select('id, property_name, address')
    .eq('owner_id', user.id)
    .order('property_name');

  // Fetch existing tokens
  const { data: tokens } = await serverSupabase
    .from('anonymous_report_tokens')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <ReportingLinksClient
      properties={properties || []}
      tokens={tokens || []}
    />
  );
}
