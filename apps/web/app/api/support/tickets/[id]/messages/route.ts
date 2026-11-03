import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import {
  parseInput,
  supportReplySchema,
  readCase,
  replyCase,
} from '@/lib/services/support/SupportService';
export const POST = withApiHandler(
  { roles: ['homeowner', 'contractor'] },
  async (req, { user, params }) => {
    const input = parseInput(supportReplySchema, await req.json());
    await readCase(params.id, user.id);
    return NextResponse.json({
      id: await replyCase(params.id, user.id, input),
    });
  }
);
