import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';

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
      throw new UnauthorizedError('Authentication required');
    }

    // Verify user is a contractor
    if (user.role !== 'contractor') {
      logger.warn('Non-contractor attempted to toggle service area', {
        service: 'contractor',
        userId: user.id,
        role: user.role
      });
      throw new ForbiddenError('Only contractors can manage service areas');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = toggleServiceAreaSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request data');
    }
    const validatedData = validation.data;

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
      throw new NotFoundError('Service area not found');
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
      throw new InternalServerError('Failed to update service area');
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
    return handleAPIError(error);
  }
}
