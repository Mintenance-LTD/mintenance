import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';

const cursorSchema = z
  .object({
    at: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();

export const GET = withApiHandler(
  { csrf: false },
  async (request, { user }) => {
    const raw = new URL(request.url).searchParams.get('cursor');
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (raw !== null) {
      try {
        if (!raw || raw.length > 512 || !/^[A-Za-z0-9_-]+$/.test(raw))
          throw new Error();
        cursor = cursorSchema.parse(
          JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
        );
      } catch {
        throw new BadRequestError(
          'Invalid page. Refresh your retained records.'
        );
      }
    }
    let query = serverSupabase
      .from('retained_dispute_records')
      .select('dispute_id, escrow_id, archived_at, review_due_at')
      .contains('participant_ids', [user.id])
      .not('escrow_id', 'is', null)
      .order('archived_at', { ascending: false })
      .order('dispute_id', { ascending: false });
    // Values are strictly validated above before interpolation into PostgREST syntax.
    if (cursor)
      query = query.or(
        `archived_at.lt.${cursor.at},and(archived_at.eq.${cursor.at},dispute_id.lt.${cursor.id})`
      );
    const { data, error } = await query.limit(51);
    if (error)
      throw new InternalServerError(
        'Unable to load retained records. Please retry.'
      );
    const rows = (data ?? []).slice(0, 50);
    const last = rows.at(-1);
    return NextResponse.json({
      records: [
        ...new Map(
          rows.map(({ dispute_id: _id, ...record }) => [
            record.escrow_id,
            record,
          ])
        ).values(),
      ],
      limit: 50,
      nextCursor:
        data && data.length > 50 && last
          ? Buffer.from(
              JSON.stringify({ at: last.archived_at, id: last.dispute_id })
            ).toString('base64url')
          : null,
    });
  }
);
