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
  async (request, { user }) => {
    const today = new Date().toISOString().split('T')[0];
    const isContractor = user.role === 'contractor';

    // 2026-05-23 audit-21 P1: CalendarScreen used to call the
    // contractor-only /api/contractor/appointments?daysAhead=180 for
    // both roles, so homeowners 403'd opening Calendar from Profile or
    // the dashboard hero. This role-agnostic route now also accepts
    // optional `daysAhead` + `limit` query params so a single endpoint
    // can back both the homeowner / contractor calendar surfaces.
    // Defaults preserve the historical "next 10 upcoming" behaviour
    // for the older dashboard widgets that don't pass either param.
    const { searchParams } = new URL(request.url);
    const daysAheadRaw = searchParams.get('daysAhead');
    const limitRaw = searchParams.get('limit');
    const daysAhead = (() => {
      const n = daysAheadRaw ? parseInt(daysAheadRaw, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? Math.min(n, 365) : null;
    })();
    const limit = (() => {
      const n = limitRaw ? parseInt(limitRaw, 10) : NaN;
      // 1000 hard cap so a forged ?limit=99999 doesn't hammer the DB
      // for a year of records.
      return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : 10;
    })();

    let query = serverSupabase
      .from('appointments')
      .select(
        `
        id, title, appointment_date, start_time, end_time,
        location_type, location_address, status, notes,
        contractor:profiles!contractor_id(id, first_name, last_name),
        client:profiles!client_id(id, first_name, last_name),
        job:jobs!job_id(id, title)
      `
      )
      .gte('appointment_date', today)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit);

    if (daysAhead != null) {
      const upper = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      query = query.lte('appointment_date', upper);
    }

    if (isContractor) {
      query = query.eq('contractor_id', user.id);
    } else {
      // 2026-05-26 audit-55 P2: homeowner filter previously matched only
      // `client_id = user.id`. Live data shows 5 of 9 appointments have
      // a NULL client_id (legacy rows + appointments inserted before
      // the contract gained client_id required-ness), so those
      // appointments showed up for the contractor but disappeared from
      // the homeowner's calendar.
      //
      // Fall back: match by `client_email = user.email` (covers manual
      // contractor-entered emails where client_id is unset) OR by
      // job ownership (the linked job's homeowner_id IS the calling
      // user). For the job-ownership lookup we first resolve the
      // homeowner's job IDs to a list so PostgREST's `or` filter stays
      // simple. This widens the recall without leaking other users'
      // appointments — contractor_id / client_id / job ownership are
      // all caller-scoped.
      const orFilters: string[] = [`client_id.eq.${user.id}`];
      if (user.email) {
        // sanitise: client_email is just an EQ filter, escape with
        // standard PostgREST syntax (no wildcards needed).
        orFilters.push(`client_email.eq.${user.email}`);
      }

      // Look up jobs this homeowner owns so we can pick up
      // appointments linked via job_id even when client_id is null.
      const { data: ownedJobs } = await serverSupabase
        .from('jobs')
        .select('id')
        .eq('homeowner_id', user.id);
      const jobIds = (ownedJobs || []).map((j) => j.id as string);
      if (jobIds.length > 0) {
        // Use the in.() helper so the OR filter handles multiple IDs.
        orFilters.push(`job_id.in.(${jobIds.join(',')})`);
      }

      query = query.or(orFilters.join(','));
    }

    const { data: appointments, error } = await query;

    if (error) {
      throw error;
    }

    // Supabase FK joins return arrays; extract first element
    const mapped = (appointments || []).map((apt: Record<string, unknown>) => {
      const contractor = Array.isArray(apt.contractor)
        ? apt.contractor[0]
        : apt.contractor;
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
          ? {
              id: contractor.id,
              name: `${contractor.first_name} ${contractor.last_name}`.trim(),
            }
          : undefined,
        client: client
          ? {
              id: client.id,
              name: `${client.first_name} ${client.last_name}`.trim(),
            }
          : undefined,
        job: job ? { id: job.id, title: job.title } : undefined,
      };
    });

    return NextResponse.json({ appointments: mapped });
  }
);
