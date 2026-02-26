import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';

export const GET = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (_request, { user }) => {
  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get upcoming appointments (next 7 days)
  const { data: upcomingData } = await serverSupabase
    .from('appointments')
    .select('id')
    .eq('contractor_id', user.id)
    .gte('appointment_date', today)
    .lte('appointment_date', weekFromNow)
    .in('status', ['scheduled', 'confirmed']);

  // Get completed appointments (last 7 days)
  const { data: completedData } = await serverSupabase
    .from('appointments')
    .select('id, duration_minutes')
    .eq('contractor_id', user.id)
    .eq('status', 'completed')
    .gte('appointment_date', weekAgo)
    .lte('appointment_date', today);

  const totalHours = completedData?.reduce((sum, apt) => {
    return sum + (apt.duration_minutes || 60) / 60;
  }, 0) || 0;

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

  const availableSlots = Math.max(0, Math.floor((40 - bookedHours)));

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

  return NextResponse.json({
    stats: {
      upcomingAppointments: upcomingData?.length || 0,
      completedThisWeek,
      totalHours: Math.round(totalHours * 10) / 10,
      availableSlots,
      weekOverWeekChange: percentageChange,
    },
  });
});
