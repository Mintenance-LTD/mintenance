import { NextRequest, NextResponse } from 'next/server';
import type { ThreadSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const limit = Math.min(Number(params.get('limit') ?? 20), 50);
    const cursor = params.get('cursor');

    const threads: ThreadSummary[] = [];

    return NextResponse.json({ threads, nextCursor: cursor ? null : null, limit });
  } catch (err) {
    console.error('[API] threads GET error', err);
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 });
  }
}