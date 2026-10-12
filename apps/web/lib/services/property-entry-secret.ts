import { serverSupabase } from '@/lib/api/supabaseServer';

/** Uses the server client only; actorId must come from the authenticated session. */
export async function readPropertyEntrySecret(
  propertyId: string,
  actorId: string,
  jobId?: string
): Promise<string | null> {
  const { data, error } = await serverSupabase.rpc('read_property_entry_secret', {
    p_property_id: propertyId,
    p_actor_id: actorId,
    p_job_id: jobId ?? null,
  });
  if (error) throw new Error('Unable to load property entry details');
  return typeof data === 'string' ? data : null;
}
