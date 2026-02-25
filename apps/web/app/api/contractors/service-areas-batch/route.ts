import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';
import { BadRequestError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const serviceAreasBatchSchema = z.object({
  contractorIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * POST /api/contractors/service-areas-batch
 * Batch fetch service areas for multiple contractors
 * Used by browse map to show coverage circles
 * Note: Requires CSRF but not auth (public map view)
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async (request) => {
    // Manual CSRF for public POST (withApiHandler only does CSRF for authenticated routes)
    await requireCSRF(request);

    const body = await request.json();
    const parsed = serviceAreasBatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError('contractorIds must be a non-empty array of UUIDs (max 100)');
    }
    const { contractorIds } = parsed.data;

    logger.info('Fetching service areas for contractors', {
      count: contractorIds.length,
      route: '/api/contractors/service-areas-batch',
    });

    // Fetch service areas for all contractors in one query
    const { data, error } = await serverSupabase
      .from('service_areas')
      .select('*')
      .in('contractor_id', contractorIds)
      .eq('is_active', true);

    if (error) {
      logger.error('Failed to fetch service areas', {
        error: error.message,
        contractorIds: contractorIds.slice(0, 5),
      });
      throw error;
    }

    // Group by contractor_id
    const groupedByContractor = data.reduce((acc, area) => {
      if (!acc[area.contractor_id]) {
        acc[area.contractor_id] = [];
      }

      acc[area.contractor_id].push({
        id: area.id,
        contractorId: area.contractor_id,
        city: area.city,
        state: area.state,
        zipCode: area.zip_code,
        country: area.country,
        latitude: area.latitude,
        longitude: area.longitude,
        radius_km: area.service_radius || 25,
        is_active: area.is_active,
        priority: area.priority,
      });

      return acc;
    }, {} as Record<string, ({ id: string; contractorId: string; city: string; state: string; zipCode: string; country: string; latitude: number; longitude: number; radius_km: number; is_active: boolean; priority: number })[]>);

    const result = Object.entries(groupedByContractor);

    logger.info('Service areas fetched successfully', {
      contractorCount: result.length,
      totalAreas: data.length,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  },
);

/**
 * GET /api/contractors/service-areas-batch
 * Returns usage info (use POST for actual data)
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 30 } },
  async () => {
    return NextResponse.json(
      {
        message: 'Use POST method with contractorIds in body',
        example: { contractorIds: ['uuid1', 'uuid2'] },
      },
      { status: 200 },
    );
  },
);
