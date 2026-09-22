import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

/** Call only after property management authorization. Reserve before contacting the provider. */
export async function deliverTenantInvitation(
  tenantId: string,
  propertyId: string,
  send: () => Promise<boolean>
) {
  const claim = await serverSupabase.rpc('claim_property_invitation', {
    p_tenant_id: tenantId,
    p_property_id: propertyId,
  });
  if (claim.error) throw new Error('Invitation reservation unavailable');
  if (typeof claim.data !== 'string') return { sent: false, reserved: false };
  let sent = false;
  try {
    sent = await send();
  } catch {
    /* A lost provider response is unknown, not proof of no delivery. */
  }
  const finished = await serverSupabase.rpc('finish_property_invitation', {
    p_tenant_id: tenantId,
    p_attempt_id: claim.data,
    p_sent: sent,
  });
  if (finished.error || finished.data !== true)
    logger.warn('Invitation outcome tracking pending', {
      service: 'tenant-invitation',
      tenantId,
    });
  return { sent, reserved: true };
}
