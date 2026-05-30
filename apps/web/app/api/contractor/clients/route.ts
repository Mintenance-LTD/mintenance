import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { logger } from '@mintenance/shared';
import { getRealisedAmount } from '@/lib/services/jobs/job-amount';

// 2026-05-01 audit follow-up: closes the ClientRepository direct-
// Supabase insert path. Mobile `AddClientScreen` previously instantiated
// `ClientManagementService` and inserted into `contractor_clients`
// directly; while RLS scoped the insert correctly, the rest of the
// contractor-write surface goes through the API. Adding POST here
// brings client creation in line with the rest of the contractor-API
// pattern.
const createContractorClientSchema = z
  .object({
    type: z.enum(['individual', 'business']).default('individual'),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().email().max(200),
    phone: z.string().max(40).optional(),
    companyName: z.string().max(200).optional(),
    address: z
      .object({
        street: z.string().max(200).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        zipCode: z.string().max(20).optional(),
        country: z.string().max(40).optional(),
      })
      .optional(),
    source: z.string().max(40).default('manual'),
    notes: z.string().max(5000).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
  })
  .strict();

/**
 * GET /api/contractor/clients
 * Returns the contractor's client list derived from jobs and bids.
 * Uses service_role to bypass RLS (same as web CRM page).
 */
export const GET = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (_request, { user }) => {
    // 2026-05-23 audit: `jobs.final_price` does not exist on live —
    // only budget / budget_min / budget_max. Selecting it returned
    // an error and the whole GET response was empty, so mobile
    // CRMDashboardScreen showed "no clients" even when the contractor
    // had completed work. Switched to joining escrow_transactions so
    // total_revenue still reflects money that actually changed hands
    // (matches the source-of-truth used by /api/contractors/[id]/
    // metrics earnings).
    const { data: jobs } = await serverSupabase
      .from('jobs')
      .select(
        `id, homeowner_id, status, title, created_at, completed_at, budget,
         escrow_transactions(amount, status)`
      )
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
      .map((b) => b.job_id)
      .filter((id): id is string => !!id && !jobMap.has(id));

    if (bidJobIds.length > 0) {
      const { data: extraJobs } = await serverSupabase
        .from('jobs')
        .select(
          `id, homeowner_id, status, title, created_at, completed_at, budget,
           escrow_transactions(amount, status)`
        )
        .in('id', bidJobIds);
      for (const j of extraJobs || []) {
        jobMap.set(j.id, j as Record<string, unknown>);
      }
    }

    // Fetch homeowner profiles
    const homeownerIds = [
      ...new Set(
        [...jobMap.values()]
          .map((j) => j.homeowner_id as string)
          .filter(Boolean)
      ),
    ];

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
    const clientMap = new Map<
      string,
      {
        jobs: Record<string, unknown>[];
        owner: Record<string, unknown> | undefined;
      }
    >();
    for (const job of jobMap.values()) {
      const hid = job.homeowner_id as string;
      if (!hid) continue;
      const entry = clientMap.get(hid) || {
        jobs: [],
        owner: profileMap.get(hid),
      };
      entry.jobs.push(job);
      clientMap.set(hid, entry);
    }

    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const clients = [...clientMap.entries()].map(
      ([hid, { jobs: cj, owner }]) => {
        const done = cj.filter(
          (j) => j.status === 'completed' || j.status === 'in_progress'
        );
        // 2026-05-23: revenue derived from released escrow per job
        // (was `final_price || budget || 0`; final_price doesn't
        // exist on live and budget is NULL under open-bidding, so
        // every client read £0).
        const rev = cj.reduce((s, j) => {
          const escrowRows = Array.isArray(j.escrow_transactions)
            ? (j.escrow_transactions as Array<{
                amount?: number | string | null;
                status?: string | null;
              }>)
            : j.escrow_transactions
              ? [
                  j.escrow_transactions as {
                    amount?: number | string | null;
                    status?: string | null;
                  },
                ]
              : [];
          const realised = escrowRows.reduce<number>((acc, t) => {
            const r = getRealisedAmount({
              escrow_amount: Number(t.amount ?? 0),
              escrow_status: t.status ?? null,
            });
            return acc + (r ?? 0);
          }, 0);
          // Fall back to the (rarely-set) homeowner budget only when
          // nothing has been released yet — better than £0 on the UI.
          return s + (realised > 0 ? realised : (j.budget as number) || 0);
        }, 0);
        const sorted = [...cj].sort(
          (a, b) =>
            new Date(b.created_at as string).getTime() -
            new Date(a.created_at as string).getTime()
        );
        const last = sorted[0];
        const lastDate = (last?.completed_at ||
          last?.created_at ||
          '') as string;
        const lastMs = lastDate ? new Date(lastDate).getTime() : 0;
        const status =
          done.length === 0
            ? 'prospect'
            : now - lastMs <= NINETY_DAYS
              ? 'active'
              : 'inactive';

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
      }
    );

    // 2026-05-23 audit-22 P1: also surface manually-added
    // contractor_clients rows. Mobile AddClientScreen / POST below
    // writes there, but this GET used to read only from jobs/bids —
    // contractors added a client, saw success, and the row never
    // appeared in CRM. Merge by email when there's already a derived
    // entry (avoid duplicating the same human), otherwise add as a
    // standalone manual entry with relationship_status='prospect'.
    // 2026-05-23 audit-22 P1 (#115): every returned client now carries
    // both `client_id` (the canonical identifier the detail screen
    // uses) and `homeowner_id` (the profile.id, null for manual rows
    // with no platform account) plus `recent_job_id` for messaging.
    const { data: manualClients } = await serverSupabase
      .from('contractor_clients')
      .select(
        'id, first_name, last_name, email, phone, company_name, relationship_status, created_at'
      )
      .eq('contractor_id', user.id);

    const clientsByEmail = new Map<string, (typeof clients)[number]>();
    for (const c of clients) {
      if (c.email) clientsByEmail.set(c.email.toLowerCase(), c);
    }

    // recent_job_id lookup — for each homeowner, the most recent job
    // (any status). Used by the CRM message buttons so navigation
    // lands on a real thread instead of passing a homeowner UUID as
    // the conversation key.
    const recentJobIdByHomeowner = new Map<string, string>();
    for (const job of jobMap.values()) {
      const hid = job.homeowner_id as string;
      if (!hid) continue;
      if (!recentJobIdByHomeowner.has(hid)) {
        recentJobIdByHomeowner.set(hid, job.id as string);
      }
    }

    type EnrichedClient = (typeof clients)[number] & {
      client_id: string;
      homeowner_id: string | null;
      recent_job_id: string | null;
    };

    const enrichedDerived: EnrichedClient[] = clients.map((c) => ({
      ...c,
      client_id: c.id,
      homeowner_id: c.id,
      recent_job_id: recentJobIdByHomeowner.get(c.id) ?? null,
    }));

    const manualOnly: EnrichedClient[] = [];
    for (const m of manualClients ?? []) {
      const emailKey = (m.email as string | null)?.toLowerCase() ?? '';
      if (emailKey && clientsByEmail.has(emailKey)) {
        // Already covered by a job-derived row — skip the duplicate.
        continue;
      }
      manualOnly.push({
        id: m.id as string,
        client_id: m.id as string,
        homeowner_id: null,
        recent_job_id: null,
        first_name: (m.first_name as string) || 'Unnamed',
        last_name: (m.last_name as string) || '',
        email: (m.email as string) || '',
        phone: (m.phone as string) || undefined,
        profile_image_url: undefined,
        total_jobs: 0,
        total_revenue: 0,
        last_job_date: '',
        last_job_title: 'Manually added',
        relationship_status: ((m.relationship_status as string) ||
          'prospect') as 'prospect' | 'active' | 'inactive',
      });
    }

    const merged = [...enrichedDerived, ...manualOnly];
    merged.sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`
      )
    );

    return NextResponse.json({ clients: merged });
  }
);

/**
 * POST /api/contractor/clients
 * Create a contractor-managed client row. Writes to `contractor_clients`
 * (separate from the GET derived-from-jobs feed above).
 *
 * 2026-05-01 audit follow-up: closes the mobile direct-Supabase insert
 * in `apps/mobile/src/services/client-management/ClientRepository.ts`.
 */
export const POST = withApiHandler(
  { roles: ['contractor'], rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }
    const parsed = createContractorClientSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.issues[0]?.message ?? 'Invalid client payload'
      );
    }
    const data = parsed.data;

    // 2026-05-23 audit: live `contractor_clients` schema requires
    // `relationship_status` (NOT NULL) — the row used to be inserted
    // with `status: 'prospect'` which silently dropped to default
    // (or errored, depending on policy). Also added `client_type`
    // (NOT NULL on live; existing rows are all 'residential') and
    // defaulted first/last name to empty strings since the columns
    // are NOT NULL — matches the pattern already in the live data
    // (some rows have empty-string names for orgs).
    const { data: client, error } = await serverSupabase
      .from('contractor_clients')
      .insert({
        contractor_id: user.id,
        type: data.type,
        client_type: 'residential',
        first_name: data.firstName ?? '',
        last_name: data.lastName ?? '',
        email: data.email,
        phone: data.phone ?? null,
        company_name: data.companyName ?? null,
        address: data.address ?? null,
        source: data.source,
        notes: data.notes ?? null,
        tags: data.tags ?? [],
        relationship_status: 'prospect',
        priority: 'medium',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to insert contractor_clients row', error, {
        service: 'contractor-clients',
        userId: user.id,
      });
      throw new InternalServerError('Failed to create client');
    }

    return NextResponse.json({ client }, { status: 201 });
  }
);
