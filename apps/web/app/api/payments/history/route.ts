import { NextRequest, NextResponse } from 'next/server';
import type { Payment } from '@mintenance/types/src/contracts';
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

    const payments: Payment[] = [];

    return NextResponse.json({ payments, nextCursor: cursor ? null : null, limit });
  } catch (err) {
    console.error('[API] payments history GET error', err);
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
  }
}