import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@/lib/logger';

export class PropertyEntryUnavailableError extends Error {
  readonly databaseCode: string;
  constructor(code?: string) {
    super('Unable to load property entry details');
    this.name = 'PropertyEntryUnavailableError';
    // Preserve diagnostics without provider messages, payloads or entry secrets.
    this.databaseCode =
      code && /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(code) ? code : 'UNKNOWN';
  }
}

/** actorId must come from the authenticated session, never request input. */
export async function readPropertyEntrySecret(
  propertyId: string,
  actorId: string,
  jobId?: string
): Promise<string | null> {
  let result;
  try {
    result = await serverSupabase.rpc('read_property_entry_secret', {
      p_property_id: propertyId,
      p_actor_id: actorId,
      p_job_id: jobId ?? null,
    });
  } catch {
    throw new PropertyEntryUnavailableError();
  }
  if (result.error) throw new PropertyEntryUnavailableError(result.error.code);
  return typeof result.data === 'string' ? result.data : null;
}

/** Page-only degradation. API/mutation callers retain the throwing contract. */
export async function readPropertyEntryForDisplay(
  propertyId: string,
  actorId: string,
  jobId?: string
): Promise<{ code: string | null; unavailable: boolean }> {
  try {
    return {
      code: await readPropertyEntrySecret(propertyId, actorId, jobId),
      unavailable: false,
    };
  } catch (error) {
    if (!(error instanceof PropertyEntryUnavailableError)) throw error;
    logger.error('Property entry lookup unavailable', {
      service: 'property-entry-secret',
      databaseCode: error.databaseCode,
    });
    return { code: null, unavailable: true };
  }
}
