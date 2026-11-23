import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getPropertyForManagement } from '@/lib/services/property-team/property-management-access';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';

const pageSize = 25;
const cursorSchema = z.object({
  date: z.iso.datetime({ offset: true }),
  id: z
    .string()
    .regex(
      /^(?:job|complete|document|inspection|payment|funded|released|dispute|message)-[0-9a-f-]{36}$/
    ),
});

function decodeCursor(value: string | null) {
  if (value === null) return null;
  try {
    if (!/^[\w-]{1,256}$/.test(value)) throw new Error();
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    );
  } catch {
    throw new BadRequestError('Invalid activity page');
  }
}

export const GET = withApiHandler(
  { roles: ['homeowner'], csrf: false },
  async (request, { user, params }) => {
    const search = request.nextUrl.searchParams;
    if (search.has('offset') && search.get('offset') !== '0')
      throw new BadRequestError(
        'Reload the property to continue viewing its history'
      );
    const cursor = decodeCursor(search.get('cursor'));
    const property = await getPropertyForManagement(user, params.id, 'view');
    if (property.owner_id !== user.id)
      throw new ForbiddenError(
        'Only the property owner can view the combined history'
      );

    const { data, error } = await serverSupabase.rpc(
      'read_property_activity_page',
      {
        p_actor: user.id,
        p_property: params.id,
        p_before: cursor?.date ?? null,
        p_event_key: cursor?.id ?? null,
      }
    );
    if (error?.code === '42501')
      throw new ForbiddenError(
        'Only the property owner can view the combined history'
      );
    if (error || !Array.isArray(data))
      throw new Error('Unable to load complete property history');

    const events = data.slice(0, pageSize);
    const last = events.at(-1);
    const nextCursor =
      data.length > pageSize && last
        ? Buffer.from(
            JSON.stringify({ date: last.date, id: last.id })
          ).toString('base64url')
        : null;
    return NextResponse.json(
      { events, nextCursor, hasMore: !!nextCursor },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }
);
