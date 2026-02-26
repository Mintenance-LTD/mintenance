import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { AdminNotificationService } from '@/lib/services/admin/AdminNotificationService';
import { serverSupabase } from '@/lib/api/supabaseServer';

/**
 * GET: Return count of contractors awaiting admin verification
 */
export const GET = withApiHandler({ roles: ['admin'] }, async () => {
  const { count, error } = await serverSupabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'contractor')
    .neq('admin_verified', true)
    .is('deleted_at', null);

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count || 0 });
});

/**
 * POST: Send pending verification notifications
 * Can be called manually by admin or scheduled via cron job
 */
export const POST = withApiHandler({ roles: ['admin'], rateLimit: { maxRequests: 10 } }, async () => {
  await AdminNotificationService.notifyPendingVerifications();

  return NextResponse.json({
    success: true,
    message: 'Pending verification notifications sent'
  });
});
