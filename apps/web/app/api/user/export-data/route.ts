import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase, createRequestScopedClient } from '@/lib/api/supabaseServer';

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

  const exportData = {
    exported_at: new Date().toISOString(),
    user: userData,
    properties: properties || [],
    jobs: jobs || [],
    messages: messages || [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mintenance-data-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
});
