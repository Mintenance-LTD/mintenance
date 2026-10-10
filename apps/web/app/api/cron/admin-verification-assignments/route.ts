import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EmailService } from '@/lib/email-service';
export const GET = withCronHandler('admin-verification-assignments', async () => {
  if (process.env.ADMIN_VERIFICATION_ASSIGNMENTS_ENABLED !== 'true') return { status: 'disabled' };
  const { data: assigned, error } = await serverSupabase.rpc('assign_admin_verifications');
  if (error) throw new Error('Admin assignment failed');
  const { data: tasks, error: readError } = await serverSupabase.from('admin_verification_tasks')
    .select('id,admin_id,contractor_id').eq('status','open').eq('email_status','pending').limit(25);
  if (readError) throw new Error('Could not load assignment notifications');
  let sent = 0;
  let failed = 0;
  for (const task of tasks || []) {
    const { data: claimed, error: claimError } = await serverSupabase.from('admin_verification_tasks')
      .update({ email_status: 'sending' }).eq('id',task.id).eq('email_status','pending').select('id').maybeSingle();
    if (claimError) throw new Error('Could not claim assignment notification');
    if (!claimed) continue;
    const { data: admin } = await serverSupabase.from('profiles').select('email')
      .eq('id',task.admin_id).eq('role','admin').is('deleted_at',null).maybeSingle();
    const delivered = admin && await EmailService.sendEmail({
      to: admin.email, subject: '[Mintenance] Contractor verification assigned to you',
      html: '<p>A contractor verification is assigned to you.</p><p><a href="https://www.mintenance.co.uk/admin/verifications">Open contractor verifications</a></p>',
      text: 'Verification task ' + task.id + ' is assigned to you. Open https://www.mintenance.co.uk/admin/users/' + task.contractor_id,
      timeoutMs: 10000,
    });
    const { error: saveError } = await serverSupabase.from('admin_verification_tasks')
      .update({email_status:delivered ? 'sent':'needs_review'}).eq('id',task.id);
    if (saveError) throw new Error('Email result needs review');
    if (delivered) sent++; else failed++;
  }
  return { assigned, sent, failed, status: failed ? 'needs_review' : 'completed' };
});
