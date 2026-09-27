import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { requireAdminFromDatabase } from '@/lib/admin-verification';
import { readRecoveryHealth } from '@/lib/operations/recovery-health';

export const GET = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    await requireAdminFromDatabase(user.id);
    return NextResponse.json(await readRecoveryHealth(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
);
