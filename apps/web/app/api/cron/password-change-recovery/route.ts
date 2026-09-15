import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ServiceUnavailableError } from '@/lib/errors/api-error';
export const maxDuration = 60;
export const GET = withCronHandler('password-change-recovery', async () => {
  const { data, error } = await serverSupabase.rpc(
    'recover_password_change_revocations'
  );
  if (error) throw new ServiceUnavailableError('Password session cleanup');
  return { processed: data };
});
