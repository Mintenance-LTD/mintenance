import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: availability, error } = await serverSupabase
      .from('contractor_availability')
      .select('*')
      .eq('contractor_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
  } catch (error) {
    console.error('Error in availability API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { availability } = body; // Array of availability objects

    if (!Array.isArray(availability)) {
      return NextResponse.json(
        { error: 'Invalid availability data' },
        { status: 400 }
      );
    }

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
        console.error('Error updating availability:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update availability API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
