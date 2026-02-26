import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/appointments
 * Returns upcoming appointments for the authenticated user.
 * - Homeowners: where client_id = user.id
 * - Contractors: where contractor_id = user.id
 */
export const GET = withApiHandler(
  { rateLimit: { maxRequests: 60 }, csrf: false },
  async (_request, { user }) => {
    const today = new Date().toISOString().split('T')[0];
    const isContractor = user.role === 'contractor';

    let query = serverSupabase
      .from('appointments')
      .select(`
        id, title, appointment_date, start_time, end_time,
        location_type, location_address, status, notes,
        contractor:profiles!contractor_id(id, first_name, last_name),
        client:profiles!client_id(id, first_name, last_name),
        job:jobs!job_id(id, title)
      `)
      .gte('appointment_date', today)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(10);

    if (isContractor) {
      query = query.eq('contractor_id', user.id);
    } else {
      query = query.eq('client_id', user.id);
    }

    const { data: appointments, error } = await query;

    if (error) {
      throw error;
    }

    // Supabase FK joins return arrays; extract first element
    const mapped = (appointments || []).map((apt: Record<string, unknown>) => {
      const contractor = Array.isArray(apt.contractor) ? apt.contractor[0] : apt.contractor;
      const client = Array.isArray(apt.client) ? apt.client[0] : apt.client;
      const job = Array.isArray(apt.job) ? apt.job[0] : apt.job;
      return {
        id: apt.id,
        title: apt.title,
        date: apt.appointment_date,
        time: apt.start_time,
        endTime: apt.end_time,
        locationType: apt.location_type,
        locationAddress: apt.location_address,
        status: apt.status,
        notes: apt.notes,
        contractor: contractor
          ? { id: contractor.id, name: `${contractor.first_name} ${contractor.last_name}`.trim() }
          : undefined,
        client: client
          ? { id: client.id, name: `${client.first_name} ${client.last_name}`.trim() }
          : undefined,
        job: job ? { id: job.id, title: job.title } : undefined,
      };
    });

    return NextResponse.json({ appointments: mapped });
  },
);
