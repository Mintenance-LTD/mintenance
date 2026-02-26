import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { withApiHandler } from '@/lib/api/with-api-handler';

const updateTripSchema = z.object({
  status: z.enum(['arrived', 'completed', 'cancelled']),
});

/**
 * PATCH /api/contractor/trips/[id]
 * Update trip status (contractor only)
 */
export const PATCH = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user, params }) => {
    const resolvedParams = params;

    const validation = await validateRequest(request, updateTripSchema);
    if (validation instanceof NextResponse) return validation;
    const { status } = validation.data;

    // Fetch the trip
    const { data: trip, error: fetchError } = await serverSupabase
      .from('contractor_trips')
      .select('*, job:jobs!job_id(homeowner_id, title)')
      .eq('id', resolvedParams.id)
      .eq('contractor_id', user.id)
      .single();

    if (fetchError || !trip) throw new NotFoundError('Trip not found');

    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      en_route: ['arrived', 'cancelled'],
      arrived: ['completed', 'cancelled'],
    };

    if (!validTransitions[trip.status]?.includes(status)) {
      throw new BadRequestError(`Cannot transition from '${trip.status}' to '${status}'`);
    }

    // Update trip
    const updateData: Record<string, unknown> = { status };
    if (status === 'arrived') updateData.arrived_at = new Date().toISOString();
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    const { data: updatedTrip, error: updateError } = await serverSupabase
      .from('contractor_trips')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating trip', updateError, { service: 'trips' });
      throw updateError;
    }

    // Update contractor_locations context
    const contextMap: Record<string, string> = {
      arrived: 'on_job',
      completed: 'available',
      cancelled: 'available',
    };

    await serverSupabase
      .from('contractor_locations')
      .update({
        context: contextMap[status],
        is_active: status === 'arrived',
        is_sharing_location: status === 'arrived',
        location_timestamp: new Date().toISOString(),
      })
      .eq('contractor_id', user.id);

    // Get contractor name
    const { data: contractor } = await serverSupabase
      .from('profiles')
      .select('first_name, last_name, company_name')
      .eq('id', user.id)
      .single();
    const contractorName = contractor
      ? `${contractor.first_name} ${contractor.last_name}`.trim() || contractor.company_name || 'Your contractor'
      : 'Your contractor';

    const homeownerId = trip.job?.homeowner_id;
    const jobTitle = trip.job?.title;

    // Notify homeowner on arrival
    if (status === 'arrived' && homeownerId) {
      await NotificationService.createNotification({
        userId: homeownerId,
        type: 'contractor_arrived',
        title: 'Contractor Has Arrived',
        message: `${contractorName} has arrived${jobTitle ? ` for "${jobTitle}"` : ''}.`,
        metadata: { tripId: updatedTrip.id, jobId: trip.job_id, contractorId: user.id },
      });
    }

    // Notify admins on arrival
    if (status === 'arrived') {
      try {
        const { data: admins } = await serverSupabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .is('deleted_at', null);

        if (admins && admins.length > 0) {
          await Promise.all(admins.map(admin =>
            NotificationService.createNotification({
              userId: admin.id,
              type: 'contractor_arrived',
              title: 'Contractor Arrived',
              message: `${contractorName} arrived at ${jobTitle || 'appointment location'}`,
              metadata: { tripId: updatedTrip.id, jobId: trip.job_id, contractorId: user.id },
            }),
          ));
        }
      } catch (adminErr) {
        logger.error('Failed to notify admins of arrival', adminErr, { service: 'trips' });
      }
    }

    return NextResponse.json({ trip: updatedTrip });
  },
);

/**
 * GET /api/contractor/trips/[id]
 * View a specific trip (contractor, homeowner of job, or admin)
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 30 } },
  async (_request, { user, params }) => {
    const resolvedParams = params;

    const { data: trip, error } = await serverSupabase
      .from('contractor_trips')
      .select('*, job:jobs!job_id(id, title, homeowner_id, latitude, longitude)')
      .eq('id', resolvedParams.id)
      .single();

    if (error || !trip) throw new NotFoundError('Trip not found');

    // Allow contractor, homeowner (of the job), or admin
    const isContractor = trip.contractor_id === user.id;
    const isHomeowner = trip.job?.homeowner_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isContractor && !isHomeowner && !isAdmin) {
      throw new ForbiddenError('Not authorized to view this trip');
    }

    return NextResponse.json({ trip });
  },
);
