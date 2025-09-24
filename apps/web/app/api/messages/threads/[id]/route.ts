import { NextRequest, NextResponse } from 'next/server';
import type { Message, ThreadSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';

interface Params { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Thread id is required' }, { status: 400 });
    }

    const thread: ThreadSummary | null = null;
    const messages: Message[] = [];

    if (!thread) {
      return NextResponse.json({ thread: null, messages });
    }

    return NextResponse.json({ thread, messages, nextCursor: null });
  } catch (err) {
    console.error('[API] thread GET error', err);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
}