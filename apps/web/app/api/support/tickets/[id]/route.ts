import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { readCase } from '@/lib/services/support/SupportService';
export const GET = withApiHandler(
  { roles: ['homeowner', 'contractor'], csrf: false },
  async (_req, { user, params }) =>
    NextResponse.json(await readCase(params.id, user.id))
);
