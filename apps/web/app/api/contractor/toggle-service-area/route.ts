import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';

// Validation schema
const toggleServiceAreaSchema = z.object({
  serviceAreaId: z.string().uuid(),
  isActive: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
// Authenticate user
    const user = await getCurrentUserFromCookies();

    if (!user) {
      logger.warn('Unauthorized toggle service area attempt', { service: 'contractor' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to toggle service area', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      return NextResponse.json({ error: 'Only contractors can manage service areas' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = toggleServiceAreaSchema.parse(body);

    // Verify service area exists and belongs to contractor
    const { data: serviceArea, error: areaError } = await serverSupabase
      .from('service_areas')
      .select('id, city, state')
      .eq('id', validatedData.serviceAreaId)
      .eq('contractor_id', user.id)
      .single();

    if (areaError || !serviceArea) {
      logger.warn('Attempted to toggle non-existent or unauthorized service area', {
        service: 'contractor',
        serviceAreaId: validatedData.serviceAreaId,
        contractorId: user.id
      });
      return NextResponse.json({ error: 'Service area not found' }, { status: 404 });
    }

    // Update service area status
    const { error: updateError } = await serverSupabase
      .from('service_areas')
      .update({
        is_active: validatedData.isActive
      })
      .eq('id', validatedData.serviceAreaId)
      .eq('contractor_id', user.id);

    if (updateError) {
      logger.error('Failed to toggle service area', updateError, {
        service: 'contractor',
        serviceAreaId: validatedData.serviceAreaId
      });
      return NextResponse.json({ error: 'Failed to update service area' }, { status: 500 });
    }

    logger.info('Service area toggled successfully', {
      service: 'contractor',
      serviceAreaId: validatedData.serviceAreaId,
      contractorId: user.id,
      isActive: validatedData.isActive,
      location: `${serviceArea.city}, ${serviceArea.state}`
    });

    return NextResponse.json({
      success: true,
      message: `Service area ${validatedData.isActive ? 'activated' : 'deactivated'} successfully`,
      serviceArea: {
        id: serviceArea.id,
        city: serviceArea.city,
        state: serviceArea.state,
        isActive: validatedData.isActive
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid toggle service area data', {
        service: 'contractor',
        errors: error.issues
      });
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    logger.error('Unexpected error in toggle-service-area', error, { service: 'contractor' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
