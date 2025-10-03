import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await context.params;
    if (!threadId) {
      return NextResponse.json({ error: 'Thread id is required' }, { status: 400 });
    }

    const { data: jobData, error: jobError } = await serverSupabase
      .from('jobs')
      .select('homeowner_id, contractor_id')
      .eq('id', threadId)
      .single();

    if (jobError) {
      console.error('[API] mark-read job error', jobError);
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const isParticipant =
      jobData?.homeowner_id === user.id || jobData?.contractor_id === user.id;
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updatedRows, error: updateError } = await serverSupabase
      .from('messages')
      .update({ read: true })
      .eq('job_id', threadId)
      .eq('receiver_id', user.id)
      .eq('read', false)
      .select('id');

    if (updateError) {
      console.error('[API] mark-read update error', updateError);
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
    }

    const updated = updatedRows?.length ?? 0;
    return NextResponse.json({ updated });
  } catch (err) {
    console.error('[API] mark-read error', err);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
