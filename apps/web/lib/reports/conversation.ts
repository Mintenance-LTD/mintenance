import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { reportPhotos } from './followup';
const input = z.object({
  reportId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(5000).optional(),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  latest: z.enum(['true', 'false']).optional(),
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
  const args = {
    p_report: value.data.reportId,
    p_actor: actor,
    p_hash: actor ? null : createHash('sha256').update(receipt!).digest('hex'),
    p_message: request.method === 'POST' ? value.data.messageId : null,
    p_body: request.method === 'POST' ? value.data.body : null,
    p_offset: value.data.offset,
  };
  const initial = await serverSupabase.rpc('report_conversation', args);
  let data = initial.data;
  const error = initial.error;
  if (error?.code === '42501') throw new ForbiddenError('Report unavailable');
  if (error?.code === '22023')
    throw new BadRequestError('Message retry differs. Reload before sending.');
  if (error) throw error;
  if (
    !data ||
    !Array.isArray(data.messages) ||
    typeof data.hasMore !== 'boolean'
  )
    throw new Error('Case history could not be confirmed');
  let pageOffset = value.data.offset;
  // Authorize via the RPC before any service-role history/summary lookup.
  if (
    request.method === 'GET' &&
    value.data.latest === 'true' &&
    (data.hasMore || (pageOffset > 0 && data.messages.length === 0))
  ) {
    const countResult = await serverSupabase
      .from('report_messages')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', value.data.reportId);
    if (countResult.error) throw countResult.error;
    if (
      countResult.count === null ||
      !Number.isInteger(countResult.count) ||
      countResult.count < 0
    )
      throw new Error('Unable to count case history');
    pageOffset = Math.floor(Math.max(0, countResult.count - 1) / 25) * 25;
    const latest = await serverSupabase.rpc('report_conversation', {
      ...args,
      p_offset: pageOffset,
    });
    if (latest.error?.code === '42501')
      throw new ForbiddenError('Report unavailable');
    if (latest.error) throw latest.error;
    data = latest.data;
  }
  let summary = null;
  let summary_unavailable = false;
  if (request.method === 'GET') {
    const result = await serverSupabase
      .from('anonymous_reports')
      .select('category,description,created_at')
      .eq('id', value.data.reportId)
      .maybeSingle();
    summary_unavailable = !!result.error || !result.data;
    if (!summary_unavailable && result.data)
      summary = {
        category: result.data.category,
        description: result.data.description,
        created_at: result.data.created_at,
      };
  }
  let photos: { url: string; slot: number }[] = [];
  let photos_unavailable = false;
  try {
    photos = await reportPhotos(value.data.reportId);
  } catch {
    photos_unavailable = true;
  }
  return NextResponse.json(
    {
      ...data,
      pageOffset,
      summary,
      summary_unavailable,
      photos,
      photos_unavailable,
      ...(request.method === 'POST' ? { messageId: value.data.messageId } : {}),
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
      },
    }
  );
}
