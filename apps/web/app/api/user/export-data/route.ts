import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';

/**
 * POST /api/user/export-data
 * Export all user data (GDPR Right to Data Portability)
 */
export const POST = withApiHandler({}, async (request, { user }) => {
  // Use RLS-enforced client for user-scoped reads; fall back to service role
  const userDb = createRequestScopedClient(request) ?? serverSupabase;

  // Log the export request for GDPR compliance (audit log may need service role)
  await serverSupabase.from('gdpr_audit_log').insert({
    user_id: user.id,
    action: 'data_export',
    table_name: 'users',
    record_id: user.id,
    performed_by: user.id,
  });

  // Export user data — RLS ensures only the user's own data is returned
  const { data: userData } = await userDb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: properties } = await userDb
    .from('properties')
    .select('*')
    .eq('owner_id', user.id);

  const { data: jobs } = await userDb
    .from('jobs')
    .select('*')
    .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`);

  const { data: messages } = await userDb
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

  // 2026-05-26 audit-64 P2: previously only profile/properties/jobs/
  // messages. Mobile + web GDPR copy promises payment / invoice /
  // reviews / subscriptions / contracts — fetch them here too so
  // the two download paths return the same surface. RLS handles the
  // ownership scoping for tables the user is a party on; we also
  // include explicit eq() clauses to keep the query intent obvious
  // and avoid any RLS-policy drift surprises.
  const dedupeById = <T extends { id?: unknown }>(rows: T[] | null): T[] => {
    if (!rows) return [];
    const seen = new Set<string>();
    const out: T[] = [];
    for (const r of rows) {
      const id = typeof r.id === 'string' ? r.id : JSON.stringify(r);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(r);
    }
    return out;
  };
  const [
    bids,
    escrow,
    invoicesCtr,
    invoicesClient,
    reviewsReviewer,
    reviewsContractor,
    contractsHomeowner,
    contractsContractor,
    contractorSubs,
    homeownerSubs,
    propertyContacts,
  ] = await Promise.all([
    userDb.from('bids').select('*').eq('contractor_id', user.id),
    userDb
      .from('escrow_transactions')
      .select('*')
      .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`),
    userDb.from('invoices').select('*').eq('contractor_id', user.id),
    userDb.from('invoices').select('*').eq('client_id', user.id),
    userDb.from('reviews').select('*').eq('reviewer_id', user.id),
    userDb.from('reviews').select('*').eq('reviewee_id', user.id),
    userDb.from('contracts').select('*').eq('homeowner_id', user.id),
    userDb.from('contracts').select('*').eq('contractor_id', user.id),
    userDb
      .from('contractor_subscriptions')
      .select('*')
      .eq('contractor_id', user.id),
    userDb
      .from('homeowner_subscriptions')
      .select('*')
      .eq('homeowner_id', user.id),
    userDb.from('property_contacts').select('*').eq('owner_id', user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user: userData,
    properties: properties || [],
    jobs: jobs || [],
    messages: messages || [],
    bids: dedupeById(bids.data),
    escrow_transactions: dedupeById(escrow.data),
    invoices: dedupeById([
      ...(invoicesCtr.data ?? []),
      ...(invoicesClient.data ?? []),
    ]),
    reviews: dedupeById([
      ...(reviewsReviewer.data ?? []),
      ...(reviewsContractor.data ?? []),
    ]),
    contracts: dedupeById([
      ...(contractsHomeowner.data ?? []),
      ...(contractsContractor.data ?? []),
    ]),
    contractor_subscriptions: dedupeById(contractorSubs.data),
    homeowner_subscriptions: dedupeById(homeownerSubs.data),
    property_contacts: dedupeById(propertyContacts.data),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mintenance-data-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
});
