import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  isAvailable: z.boolean(),
});

const updateAvailabilitySchema = z.object({
  availability: z.array(availabilitySlotSchema).min(1).max(21),
});

export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const { data: availability, error } = await serverSupabase
      .from('contractor_availability')
      .select('id, day_of_week, start_time, end_time, is_available')
      .eq('contractor_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) {
      logger.error('Error fetching availability', error);
      throw new InternalServerError('Failed to fetch availability');
    }

    // Transform to client format (day names instead of numbers)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const transformedAvailability = availability?.map((slot) => ({
      id: slot.id,
      day: dayNames[slot.day_of_week],
      dayOfWeek: slot.day_of_week,
      startTime: slot.start_time,
      endTime: slot.end_time,
      isAvailable: slot.is_available,
    })) || [];

    return NextResponse.json({ availability: transformedAvailability });
  }
);

export const PUT = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const validation = await validateRequest(request, updateAvailabilitySchema);
    if (validation instanceof NextResponse) return validation;
    const { availability } = validation.data;

    // Delete existing availability
    await serverSupabase
      .from('contractor_availability')
      .delete()
      .eq('contractor_id', user.id);

    // Insert new availability
    const availabilityRecords = availability
      .filter((slot) => slot.isAvailable)
      .map((slot) => ({
        contractor_id: user.id,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        is_available: slot.isAvailable,
      }));

    if (availabilityRecords.length > 0) {
      const { error: insertError } = await serverSupabase
        .from('contractor_availability')
        .insert(availabilityRecords);

      if (insertError) {
        logger.error('Error updating availability', insertError);
        throw new InternalServerError('Failed to update availability');
      }
    }

    return NextResponse.json({ success: true });
  }
);
