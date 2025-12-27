import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { handleAPIError } from '@/lib/errors/api-error';

export async function GET(request: NextRequest) {
  try {
    const plans = await SubscriptionService.getAvailablePlans();

    return NextResponse.json({ plans });
  } catch (err) {
    return handleAPIError(err);
  }
}

