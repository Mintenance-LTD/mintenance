import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ count: 0 });
  } catch (err) {
    console.error('[API] unread-count GET error', err);
    return NextResponse.json({ error: 'Failed to load unread count' }, { status: 500 });
  }
}
