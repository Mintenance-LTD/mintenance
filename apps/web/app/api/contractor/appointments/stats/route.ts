import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';
import { availableHours } from '@/lib/scheduling/available-hours';

export const GET = withApiHandler({ roles: ['contractor'], rateLimit: { maxRequests: 30 } }, async (_request, { user }) => {
  // Appointments use UK civil dates rather than elapsed 24-hour periods.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const offsetDate = (days: number) => {
    const date = new Date(today + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const [upcoming, completed, previous, availability] = await Promise.all([
    serverSupabase.from('appointments').select('id, appointment_date, start_time, end_time')
      .eq('contractor_id', user.id).gte('appointment_date', today).lt('appointment_date', offsetDate(7))
      .in('status', ['scheduled', 'confirmed']),
    serverSupabase.from('appointments').select('id, duration_minutes')
      .eq('contractor_id', user.id).eq('status', 'completed')
      .gte('appointment_date', offsetDate(-6)).lte('appointment_date', today),
    serverSupabase.from('appointments').select('id')
      .eq('contractor_id', user.id).eq('status', 'completed')
      .gte('appointment_date', offsetDate(-13)).lt('appointment_date', offsetDate(-6)),
    serverSupabase.from('contractor_availability').select('day_of_week, start_time, end_time, is_available')
      .eq('contractor_id', user.id),
  ]);
  if ([upcoming, completed, previous, availability].some(result => result.error)) {
    throw new InternalServerError('Could not load scheduling statistics');
  }
  const hours = availableHours(today, availability.data ?? [], upcoming.data ?? []);
  const completedCount = completed.data?.length ?? 0;
  const previousCount = previous.data?.length ?? 0;
  return NextResponse.json({ stats: {
    upcomingAppointments: upcoming.data?.length ?? 0,
    completedThisWeek: completedCount,
    totalHours: Math.round((completed.data ?? []).reduce((sum, apt) => sum + (apt.duration_minutes ?? 0) / 60, 0) * 10) / 10,
    availableHours: hours,
    // Compatibility for older clients; new UI explicitly labels these as hours.
    availableSlots: hours,
    weekOverWeekChange: previousCount > 0 ? Math.round((completedCount - previousCount) / previousCount * 100) : 0,
  } });
});
