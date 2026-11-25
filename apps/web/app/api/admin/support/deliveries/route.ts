import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { sanitizeEmailIlikePattern } from '@/lib/utils/sanitize-postgrest';
import { isValidUUID } from '@/lib/validation/uuid';

const status = z.enum([
  'all',
  'pending',
  'sending',
  'accepted',
  'delivered',
  'failed',
  'needs_review',
]);
const cursorSchema = z
  .object({ at: z.string().datetime({ offset: true }), id: z.string().uuid() })
  .strict();

export const GET = withApiHandler(
  {
    roles: ['admin'],
    requireDbAdmin: true,
    csrf: false,
    rateLimit: { maxRequests: 40 },
  },
  async (request) => {
    const params = request.nextUrl.searchParams;
    const filter = status.safeParse(params.get('status') ?? 'all');
    if (!filter.success) throw new BadRequestError('Invalid delivery status');
    const search = (params.get('search') ?? '').trim().slice(0, 254);
    let query = serverSupabase
      .from('admin_communication_delivery_log')
      .select(
        'id,subject,channel,status,created_at,completed_at,last_checked_at,attempts,provider_id,last_error,recipient_email,recipient_id,case_reference,job_reference,dispute_reference'
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(31);
    if (filter.data !== 'all') query = query.eq('status', filter.data);

    if (isValidUUID(search)) {
      const reference = search.toLowerCase();
      query = query.or(
        `case_reference.eq.${reference},job_reference.eq.${reference},dispute_reference.eq.${reference},recipient_id.eq.${reference}`
      );
    } else if (z.string().email().safeParse(search).success) {
      query = query.eq('recipient_email', search.toLowerCase());
    } else if (search) {
      const term = sanitizeEmailIlikePattern(search);
      if (!term)
        throw new BadRequestError('Enter an email, subject or reference.');
      query = query.or(
        `subject.ilike.%${term}%,recipient_email.ilike.%${term}%`
      );
    }

    const cursor = params.get('after');
    if (cursor) {
      try {
        if (cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursor))
          throw new Error('Bad cursor');
        const { at, id } = cursorSchema.parse(
          JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
        );
        query = query.or(
          `created_at.lt.${at},and(created_at.eq.${at},id.lt.${id})`
        );
      } catch {
        throw new BadRequestError('Invalid delivery cursor. Reload the log.');
      }
    }

    const { data, error } = await query;
    if (error)
      throw new InternalServerError(
        'Delivery history is unavailable. Please retry.'
      );
    const records = (data ?? []).slice(0, 30);
    const last = records.at(-1);
    return NextResponse.json({
      records,
      next:
        data && data.length > 30 && last
          ? Buffer.from(
              JSON.stringify({ at: last.created_at, id: last.id })
            ).toString('base64url')
          : null,
    });
  }
);
