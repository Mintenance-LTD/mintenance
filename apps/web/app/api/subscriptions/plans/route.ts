import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';

export async function GET(request: NextRequest) {
  try {
    const plans = await SubscriptionService.getAvailablePlans();

    return NextResponse.json({ plans });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to get subscription plans', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

