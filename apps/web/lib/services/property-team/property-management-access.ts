import { serverSupabase } from '@/lib/api/supabaseServer';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { InternalServerError, NotFoundError } from '@/lib/errors/api-error';
import { PropertyTeamService } from './PropertyTeamService';

export async function getPropertyForManagement(
  user: { id: string; role: string },
  propertyId: string,
  action:
    | 'view'
    | 'manage_maintenance'
    | 'manage_compliance'
    | 'manage_contacts'
    | 'manage_team'
) {
  if (user.role === 'admin') await requireAdminFromDatabase(user.id);
  else {
    const access = await PropertyTeamService.authorize(
      user.id,
      propertyId,
      action
    );
    if (!access.authorized) throw new NotFoundError('Property not found');
  }
  const { data, error } = await serverSupabase
    .from('properties')
    .select('id, owner_id')
    .eq('id', propertyId)
    .maybeSingle();
  if (error)
    throw new InternalServerError(
      'Unable to verify property access. Please retry.'
    );
  if (!data) throw new NotFoundError('Property not found');
  return data;
}
