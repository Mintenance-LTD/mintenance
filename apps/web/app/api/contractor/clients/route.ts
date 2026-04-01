import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/contractor/clients
 * Returns the contractor's client list derived from jobs and bids.
 * Uses service_role to bypass RLS (same as web CRM page).
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    // Get all jobs where contractor is assigned
    const { data: jobs } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, status, title, created_at, completed_at, budget, final_price')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false });

    // Get jobs from accepted bids (covers pre-assignment)
    const { data: bids } = await serverSupabase
      .from('bids')
      .select('job_id')
      .eq('contractor_id', user.id)
      .eq('status', 'accepted');

    // Collect all job IDs
    const jobMap = new Map<string, Record<string, unknown>>();
    for (const j of jobs || []) {
      jobMap.set(j.id, j as Record<string, unknown>);
    }

    // Fetch bid-sourced jobs not already in map
    const bidJobIds = (bids || [])
      .map(b => b.job_id)
      .filter((id): id is string => !!id && !jobMap.has(id));

    if (bidJobIds.length > 0) {
      const { data: extraJobs } = await serverSupabase
        .from('jobs')
        .select('id, homeowner_id, status, title, created_at, completed_at, budget, final_price')
        .in('id', bidJobIds);
      for (const j of extraJobs || []) {
        jobMap.set(j.id, j as Record<string, unknown>);
      }
    }

    // Fetch homeowner profiles
    const homeownerIds = [...new Set(
      [...jobMap.values()].map(j => j.homeowner_id as string).filter(Boolean)
    )];

    const profileMap = new Map<string, Record<string, unknown>>();
    if (homeownerIds.length > 0) {
      const { data: profiles } = await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, profile_image_url')
        .in('id', homeownerIds);
      for (const p of profiles || []) {
        profileMap.set(p.id, p as Record<string, unknown>);
      }
    }

    // Derive clients
    const clientMap = new Map<string, { jobs: Record<string, unknown>[]; owner: Record<string, unknown> | undefined }>();
    for (const job of jobMap.values()) {
      const hid = job.homeowner_id as string;
      if (!hid) continue;
      const entry = clientMap.get(hid) || { jobs: [], owner: profileMap.get(hid) };
      entry.jobs.push(job);
      clientMap.set(hid, entry);
    }

    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const clients = [...clientMap.entries()].map(([hid, { jobs: cj, owner }]) => {
      const done = cj.filter(j => j.status === 'completed' || j.status === 'in_progress');
      const rev = cj.reduce((s, j) => s + ((j.final_price as number) || (j.budget as number) || 0), 0);
      const sorted = [...cj].sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
      const last = sorted[0];
      const lastDate = (last?.completed_at || last?.created_at || '') as string;
      const lastMs = lastDate ? new Date(lastDate).getTime() : 0;
      const status = done.length === 0 ? 'prospect' : (now - lastMs <= NINETY_DAYS ? 'active' : 'inactive');

      return {
        id: hid,
        first_name: (owner?.first_name as string) || 'Unknown',
        last_name: (owner?.last_name as string) || '',
        email: (owner?.email as string) || '',
        phone: owner?.phone as string | undefined,
        profile_image_url: owner?.profile_image_url as string | undefined,
        total_jobs: cj.length,
        total_revenue: rev,
        last_job_date: lastDate,
        last_job_title: (last?.title as string) || 'Untitled job',
        relationship_status: status,
      };
    });

    clients.sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));

    return NextResponse.json({ clients });
  }
);
