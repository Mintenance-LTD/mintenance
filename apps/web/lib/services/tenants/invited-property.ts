import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';

/** Minimal resident view; an invitation never grants property-management access. */
export async function getInvitedProperty(userId: string, propertyId: string) {
  const { data: tenant, error } = await serverSupabase
    .from('property_tenants')
    .select('id')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .not('invitation_accepted_at', 'is', null)
    .maybeSingle();
  if (error)
    throw new InternalServerError(
      'Unable to verify your property access. Please retry.'
    );
  if (!tenant) return null;
  const { data: property, error: propertyError } = await serverSupabase
    .from('properties')
    .select('id, property_name, address')
    .eq('id', propertyId)
    .maybeSingle();
  if (propertyError)
    throw new InternalServerError(
      'Unable to load your property. Please retry.'
    );
  return property;
}
