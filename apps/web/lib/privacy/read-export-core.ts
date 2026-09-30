import { serverSupabase } from '@/lib/api/supabaseServer';
import { readExportRows } from './read-export-rows';

/** Service reads are explicitly scoped to the authenticated subject, never a body ID. */
export async function readExportCore(userId: string) {
  const [profile, jobs, bids, messages, properties] = await Promise.all([
    serverSupabase.from('profiles').select('*').eq('id', userId).single(),
    readExportRows(() =>
      serverSupabase
        .from('jobs')
        .select('*')
        .or(
          `homeowner_id.eq.${userId},contractor_id.eq.${userId},payer_user_id.eq.${userId}`
        )
    ),
    readExportRows(() =>
      serverSupabase.from('bids').select('*').eq('contractor_id', userId)
    ),
    readExportRows(() =>
      serverSupabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    ),
    readExportRows(() =>
      serverSupabase.from('properties').select('*').eq('owner_id', userId)
    ),
  ]);
  if (
    !profile.data ||
    [profile, jobs, bids, messages, properties].some((result) => result.error)
  ) {
    return { data: null, error: { message: 'Core export unavailable' } };
  }
  return {
    data: [
      { table_name: 'users', data: profile.data as Record<string, unknown> },
      ...Object.entries({
        jobs: jobs.data,
        bids: bids.data,
        messages: messages.data,
        properties: properties.data,
      }).flatMap(([table_name, rows]) =>
        (rows ?? []).map((data) => ({ table_name, data }))
      ),
    ],
    error: null,
  };
}
