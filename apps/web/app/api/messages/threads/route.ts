import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError } from '@/lib/errors/api-error';
import {
  buildThreadParticipants,
  normalizeMessageType,
  type SupabaseJobRow,
} from '@/app/api/messages/utils';
import { withApiHandler } from '@/lib/api/with-api-handler';
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(1000).optional(),
});
const cursorSchema = z.object({
  at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
  snapshot: z.string().datetime({ offset: true }),
});
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    const { limit, cursor } = parsed.data;
    let before: string | undefined,
      beforeId: string | undefined,
      snapshot = new Date().toISOString();
    if (cursor) {
      try {
        const decoded = cursorSchema.parse(
          JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
        );
        before = decoded.at;
        beforeId = decoded.id;
        snapshot = decoded.snapshot;
      } catch {
        // Older clients may still hold an ISO cursor; new responses are opaque.
        if (!z.string().datetime({ offset: true }).safeParse(cursor).success)
          throw new BadRequestError('Invalid cursor value');
        before = cursor;
      }
    }
    // Both cookie and bearer authentication use this same narrowly scoped projection.
    const { data, error } = await serverSupabase.rpc('list_message_inbox', {
      p_actor: user.id,
      p_limit: limit + 1,
      p_snapshot: snapshot,
      p_before: before ?? null,
      p_before_id: beforeId ?? null,
    });
    if (error) throw new Error('Unable to load message threads');
    const rows = (data ?? []) as Array<{
      job: SupabaseJobRow;
      last_message: {
        content: string;
        message_type: string;
        created_at: string;
      } | null;
      unread_count: number;
      last_activity: string;
    }>;
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor =
      rows.length > limit && last
        ? Buffer.from(
            JSON.stringify({
              at: last.last_activity,
              id: last.job.id,
              snapshot,
            })
          ).toString('base64url')
        : undefined;
    return NextResponse.json({
      threads: page.map((r) => ({
        jobId: r.job.id,
        jobTitle: r.job.title ?? 'Untitled Job',
        participants: buildThreadParticipants(r.job),
        unreadCount: Number(r.unread_count),
        lastMessage: r.last_message
          ? {
              content: r.last_message.content ?? '',
              messageText: r.last_message.content ?? '',
              messageType: normalizeMessageType(r.last_message.message_type),
              createdAt: r.last_message.created_at,
            }
          : undefined,
      })),
      nextCursor,
      limit,
    });
  }
);
