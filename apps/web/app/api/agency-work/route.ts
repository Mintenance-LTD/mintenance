import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  assertPrivateWorkResult,
  privateWorkJson,
} from '@/lib/services/property-team/agency-private-dispatch';

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase.rpc(
      'agency_private_work_inbox',
      { p_actor_id: user.id }
    );
    assertPrivateWorkResult(error);
    return privateWorkJson({ items: data ?? [] });
  }
);
