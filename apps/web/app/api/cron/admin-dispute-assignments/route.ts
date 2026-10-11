import { adminDisputeAssignmentTemplate } from '@/lib/email-templates/admin-dispute';
import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EmailService } from '@/lib/email-service';
export const GET = withCronHandler('admin-dispute-assignments', async () => {
  const deadline = Date.now() + 25_000;
  // Interrupted provider calls have unknown delivery outcomes. Flag them for
  // review rather than silently leaving them stuck or sending duplicates.
  const stale = await serverSupabase
    .from('admin_dispute_tasks')
    .update({ email_status: 'needs_review' })
    .eq('email_status', 'sending')
    .lt('email_claimed_at', new Date(Date.now() - 10 * 60_000).toISOString());
  if (stale.error)
    throw new Error('Could not check interrupted assignment emails');
  const { data: assigned, error } = await serverSupabase.rpc(
    'assign_admin_disputes'
  );
  if (error) throw new Error('Admin assignment failed');
  const { data: tasks, error: readError } = await serverSupabase
    .from('admin_dispute_tasks')
    .select('id,admin_id,dispute_id')
    .eq('status', 'open')
    .not('admin_id', 'is', null)
    .eq('email_status', 'pending')
    .limit(25);
  if (readError) throw new Error('Could not load assignment notifications');
  let sent = 0;
  let failed = 0;
  for (const task of tasks || []) {
    if (Date.now() >= deadline) break;
    const { data: claimed, error: claimError } = await serverSupabase
      .from('admin_dispute_tasks')
      .update({
        email_status: 'sending',
        email_claimed_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('status', 'open')
      .eq('email_status', 'pending')
      .select('id')
      .maybeSingle();
    if (claimError) throw new Error('Could not claim assignment notification');
    if (!claimed) continue;
    const { data: admin } = await serverSupabase
      .from('profiles')
      .select('email')
      .eq('id', task.admin_id)
      .eq('role', 'admin')
      .is('deleted_at', null)
      .maybeSingle();
    const delivered =
      admin &&
      (await EmailService.sendEmail({
        to: admin.email,
        ...adminDisputeAssignmentTemplate(),
        timeoutMs: 10000,
      }));
    const { error: saveError } = await serverSupabase
      .from('admin_dispute_tasks')
      .update({ email_status: delivered ? 'sent' : 'needs_review' })
      .eq('id', task.id);
    if (saveError) throw new Error('Email result needs review');
    if (delivered) sent++;
    else failed++;
  }
  return {
    assigned,
    sent,
    failed,
    status: failed ? 'needs_review' : 'completed',
  };
});
