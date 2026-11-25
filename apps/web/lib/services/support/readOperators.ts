import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';

export async function readSupportOperators() {
  const [
    { data: settings, error: settingsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    db
      .from('support_operator_settings')
      .select('admin_id,available,capacity,can_broadcast,can_manage_team'),
    db
      .from('profiles')
      .select('id,first_name,last_name,email')
      .eq('role', 'admin')
      .is('deleted_at', null),
  ]);
  if (settingsError || profilesError)
    throw new InternalServerError('Could not load support operators');
  const byId = new Map(
    (settings ?? []).map((setting) => [setting.admin_id, setting])
  );
  return (profiles ?? []).map((profile) => ({
    ...(byId.get(profile.id) ?? {
      admin_id: profile.id,
      available: false,
      capacity: 20,
      can_broadcast: false,
      can_manage_team: false,
    }),
    name:
      [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
      profile.email ||
      'Operator',
  }));
}
