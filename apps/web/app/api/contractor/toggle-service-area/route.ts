import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const toggleServiceAreaSchema = z.object({
  serviceAreaId: z.string().uuid(),
  isActive: z.boolean(),
});

/**
 * POST /api/contractor/toggle-service-area - activate/deactivate a service area.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const body = await request.json();
    const validation = toggleServiceAreaSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestError('Invalid request data');
    }
    const { serviceAreaId, isActive } = validation.data;

    // Verify service area exists and belongs to contractor
    const { data: serviceArea, error: areaError } = await serverSupabase
      .from('service_areas')
      .select('id, city, state')
      .eq('id', serviceAreaId)
      .eq('contractor_id', user.id)
      .single();

    if (areaError || !serviceArea) {
      throw new NotFoundError('Service area not found');
    }

    const { error: updateError } = await serverSupabase
      .from('service_areas')
      .update({ is_active: isActive })
      .eq('id', serviceAreaId)
      .eq('contractor_id', user.id);

    if (updateError) {
      logger.error('Failed to toggle service area', updateError, {
        service: 'contractor',
        serviceAreaId,
      });
      throw new InternalServerError('Failed to update service area');
    }

    logger.info('Service area toggled successfully', {
      service: 'contractor',
      serviceAreaId,
      contractorId: user.id,
      isActive,
      location: `${serviceArea.city}, ${serviceArea.state}`,
    });

    return NextResponse.json({
      success: true,
      message: `Service area ${isActive ? 'activated' : 'deactivated'} successfully`,
      serviceArea: { id: serviceArea.id, city: serviceArea.city, state: serviceArea.state, isActive },
    });
  },
);
