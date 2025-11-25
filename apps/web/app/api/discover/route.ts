import { NextRequest, NextResponse } from 'next/server';
import type { ContractorSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { logger } from '@mintenance/shared';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const filters = {
      q: params.get('q') ?? null,
      category: params.get('category') ?? null,
      minRating: params.get('min_rating') ? Number(params.get('min_rating')) : null,
      lat: params.get('lat') ? Number(params.get('lat')) : null,
      lng: params.get('lng') ? Number(params.get('lng')) : null,
      radiusKm: params.get('radius_km') ? Number(params.get('radius_km')) : null,
      limit: Math.min(Number(params.get('limit') ?? 20), 50),
      cursor: params.get('cursor'),
    };

    const contractors: ContractorSummary[] = [];

    return NextResponse.json({ contractors, nextCursor: null, filters });
  } catch (err) {
    logger.error('discover GET error', err, {
      service: 'discover',
    });
    return NextResponse.json({ error: 'Failed to load contractors' }, { status: 500 });
  }
}