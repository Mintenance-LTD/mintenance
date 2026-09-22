import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
export const GET = withApiHandler(
  { csrf: false },
  async (_request, { user }) => {
    const { data, error } = await serverSupabase
      .from('retained_dispute_records')
      .select('escrow_id, archived_at, review_due_at')
      .contains('participant_ids', [user.id])
      .not('escrow_id', 'is', null)
      .order('archived_at', { ascending: false })
      .limit(50);
    if (error)
      throw new InternalServerError(
        'Unable to load retained records. Please retry.'
      );
    return NextResponse.json({
      records: [
        ...new Map(
          (data ?? []).map((record) => [record.escrow_id, record])
        ).values(),
      ],
      limit: 50,
    });
  }
);
