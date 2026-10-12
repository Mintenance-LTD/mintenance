import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
const input = z.object({
  reportId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(5000).optional(),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export async function conversation(request: NextRequest, actor: string | null) {
  const value = input.safeParse(
    request.method === 'GET'
      ? Object.fromEntries(request.nextUrl.searchParams)
      : await request.json()
  );
  if (!value.success) throw new BadRequestError('Invalid conversation request');
  const receipt = request.headers.get('x-report-receipt');
  if (!actor && (!receipt || !/^[a-f0-9]{64}$/.test(receipt)))
    throw new ForbiddenError('Report unavailable');
  if (request.method === 'POST' && (!value.data.messageId || !value.data.body))
    throw new BadRequestError('Message required');
  const { data, error } = await serverSupabase.rpc('report_conversation', {
    p_report: value.data.reportId,
    p_actor: actor,
    p_hash: actor ? null : createHash('sha256').update(receipt!).digest('hex'),
    p_message: request.method === 'POST' ? value.data.messageId : null,
    p_body: request.method === 'POST' ? value.data.body : null,
    p_offset: value.data.offset,
  });
  if (error?.code === '42501') throw new ForbiddenError('Report unavailable');
  if (error?.code === '22023')
    throw new BadRequestError('Message retry differs. Reload before sending.');
  if (error) throw error;
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
