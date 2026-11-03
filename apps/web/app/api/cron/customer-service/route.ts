import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  drainCustomerCommunications,
  reconcileCustomerEmails,
} from '@/lib/services/support/CommunicationDelivery';
export const maxDuration = 60;
export const GET = withCronHandler('customer-service', async () => {
  const assignment = await db.rpc('assign_support_cases');
  if (assignment.error) throw new Error('Support assignment failed');
  const escalation = await db.rpc('escalate_support_cases');
  if (escalation.error) throw new Error('Support escalation failed');
  return {
    assigned: assignment.data,
    escalated: escalation.data,
    ...(await drainCustomerCommunications()),
    ...(await reconcileCustomerEmails()),
  };
});
