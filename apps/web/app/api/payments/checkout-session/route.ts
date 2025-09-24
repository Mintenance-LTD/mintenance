import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    // TODO: validate amount/currency/jobId and permissions
    // TODO: create Stripe Checkout session server-side and return URL
    return NextResponse.json({ url: 'https://example.com/checkout' });
  } catch (err) {
    console.error('[API] checkout-session POST error', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

