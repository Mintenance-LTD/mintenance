import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();

    if (!user || user.role !== 'contractor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get upcoming appointments (next 7 days)
    const { data: upcomingData, error: upcomingError } = await serverSupabase
      .from('appointments')
      .select('id')
      .eq('contractor_id', user.id)
      .gte('appointment_date', today)
      .lte('appointment_date', weekFromNow)
      .in('status', ['scheduled', 'confirmed']);

    // Get completed appointments (last 7 days)
    const { data: completedData, error: completedError } = await serverSupabase
      .from('appointments')
      .select('id, duration_minutes')
      .eq('contractor_id', user.id)
      .eq('status', 'completed')
      .gte('appointment_date', weekAgo)
      .lte('appointment_date', today);

    // Get total hours from completed appointments this week
    const totalHours = completedData?.reduce((sum, apt) => {
      return sum + (apt.duration_minutes || 60) / 60;
    }, 0) || 0;

    // Calculate available slots (simplified - assumes 8 working hours/day, 1-hour slots)
    // This is a basic calculation; you might want to make this more sophisticated
    const { data: bookedSlotsData } = await serverSupabase
      .from('appointments')
      .select('duration_minutes')
      .eq('contractor_id', user.id)
      .gte('appointment_date', today)
      .lte('appointment_date', weekFromNow)
      .in('status', ['scheduled', 'confirmed']);

    const bookedHours = bookedSlotsData?.reduce((sum, apt) => {
      return sum + (apt.duration_minutes || 60) / 60;
    }, 0) || 0;

    // Assuming 5 working days, 8 hours each = 40 hours total, minus booked
    const availableSlots = Math.max(0, Math.floor((40 - bookedHours)));

    // Get last week's completed count for comparison
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: lastWeekCompletedData } = await serverSupabase
      .from('appointments')
      .select('id')
      .eq('contractor_id', user.id)
      .eq('status', 'completed')
      .gte('appointment_date', twoWeeksAgo)
      .lt('appointment_date', weekAgo);

    const completedThisWeek = completedData?.length || 0;
    const completedLastWeek = lastWeekCompletedData?.length || 0;
    const percentageChange = completedLastWeek > 0
      ? Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100)
      : 0;

    const stats = {
      upcomingAppointments: upcomingData?.length || 0,
      completedThisWeek: completedThisWeek,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
      availableSlots: availableSlots,
      weekOverWeekChange: percentageChange,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in appointments stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
