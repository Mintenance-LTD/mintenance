import { NextResponse } from 'next/server';
import type { ContractorSummary } from '@mintenance/types/src/contracts';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/discover - discover contractors with optional filters.
 */
export const GET = withApiHandler({}, async (request) => {
  const params = request.nextUrl.searchParams;
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
});
