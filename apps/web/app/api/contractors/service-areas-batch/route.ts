import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf';

/**
 * Batch fetch service areas for multiple contractors
 * Used by browse map to show coverage circles
 * 
 * POST /api/contractors/service-areas-batch
 * Body: { contractorIds: string[] }
 * Returns: Map<contractorId, ServiceArea[]>
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const body = await request.json();
    const { contractorIds } = body;

    if (!Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json(
        { error: 'contractorIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    if (contractorIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 contractors per request' },
        { status: 400 }
      );
    }

    logger.info('Fetching service areas for contractors', {
      count: contractorIds.length,
      route: '/api/contractors/service-areas-batch',
    });

    // Fetch service areas for all contractors in one query
    const { data, error } = await serverSupabase
      .from('service_areas')
      .select('*')
      .in('contractor_id', contractorIds)
      .eq('is_active', true); // Only fetch active areas

    if (error) {
      logger.error('Failed to fetch service areas', {
        error: error.message,
        contractorIds: contractorIds.slice(0, 5), // Log first 5 for debugging
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
    }, {} as Record<string, any[]>);

    // Convert to array format for response
    const result = Object.entries(groupedByContractor);

    logger.info('Service areas fetched successfully', {
      contractorCount: result.length,
      totalAreas: data.length,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 min
      },
    });
  } catch (error) {
    logger.error('Error in service-areas-batch API', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch service areas' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - returns empty array (use POST for actual data)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      message: 'Use POST method with contractorIds in body',
      example: { contractorIds: ['uuid1', 'uuid2'] },
    },
    { status: 200 }
  );
}

