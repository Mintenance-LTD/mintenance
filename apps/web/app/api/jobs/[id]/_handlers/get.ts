import { NextRequest, NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { resignJobStorageUrls } from '@/lib/api/job-storage';
import { canRevealKeySafeCode } from '@/lib/services/jobs/key-safe-reveal';

export async function handleGet(
  request: NextRequest,
  {
    user,
    params,
  }: {
    user: { id: string; [k: string]: unknown };
    params: Record<string, string>;
  }
): Promise<NextResponse> {
  // Use RLS-enforced client for user-scoped reads; fall back to service role
  const userDb = createRequestScopedClient(request) ?? serverSupabase;

  const { id } = params;

  // Explicit column selection to avoid leaking sensitive data.
  // Audit step 4 finish (2026-04-29): selecting `urgency` (the
  // canonical DB column per migration 002_job_system) instead of
  // the previous `priority`. The PUT/PATCH handler now writes to
  // `urgency` too — keeping the GET on the wrong column meant
  // edited urgencies appeared as 'medium' in detail view even
  // though the save succeeded.
  const { data, error } = await userDb
    .from('jobs')
    .select(
      'id, title, description, status, homeowner_id, contractor_id, category, budget, budget_min, budget_max, urgency, location, city, postcode, latitude, longitude, start_date, end_date, scheduled_start_date, flexible_timeline, access_info, requirements, property_id, created_at, updated_at'
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      logger.warn('Job not found', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
      });
      throw new NotFoundError('Job not found');
    }
    logger.error('Failed to load job', error, {
      service: 'jobs',
      userId: user.id,
      jobId: id,
    });
    throw error;
  }

  const row = data as Record<string, unknown>;
  // Audit re-review (2026-04-29): contractors used to be locked
  // out of unassigned posted jobs entirely, which broke the bid
  // flow — they could see the job in the discover-map list but
  // got 403 on the detail screen they need to evaluate before
  // bidding. Now allow:
  //   1. The homeowner who posted it.
  //   2. The contractor currently assigned to it.
  //   3. Any contractor when the job is still in `posted` status
  //      and unassigned. Lets them open the detail screen and
  //      submit a bid.
  // Admins still come through the layout-level role gate.
  const isHomeowner = row.homeowner_id === user.id;
  const isAssignedContractor = row.contractor_id === user.id;
  const isContractorViewingOpenJob =
    user.role === 'contractor' &&
    row.status === 'posted' &&
    (row.contractor_id === null || row.contractor_id === undefined);
  if (
    !isHomeowner &&
    !isAssignedContractor &&
    !isContractorViewingOpenJob &&
    user.role !== 'admin'
  ) {
    logger.warn('Unauthorized job access attempt', {
      service: 'jobs',
      userId: user.id,
      role: user.role,
      jobId: id,
      jobStatus: row.status,
      homeownerId: row.homeowner_id,
      contractorId: row.contractor_id,
    });
    throw new ForbiddenError('You do not have permission to view this job');
  }

  logger.info('Job retrieved', {
    service: 'jobs',
    userId: user.id,
    jobId: id,
  });

  // Fetch + re-sign photo URLs server-side. Mobile homeowner job detail
  // hero was rendering empty because:
  //   1. This handler previously returned `images: []` (never queried photos).
  //   2. Mobile's fallback `JobCRUDService.getJobById` queried Supabase
  //      directly, which returns raw legacy `public/Job-storage/...` URLs
  //      that 404 after the 2026-04-17 bucket flip.
  // Sign URLs here so the canonical /api/jobs/[id] caller (mobile detail
  // screen) gets working URLs for free, matching the /api/jobs list
  // endpoint behaviour shipped in commit e3d85cef.
  const [attachmentsRes, photoMetaRes] = await Promise.all([
    userDb
      .from('job_attachments')
      .select('file_url')
      .eq('job_id', id)
      .eq('file_type', 'image'),
    userDb.from('job_photos_metadata').select('photo_url').eq('job_id', id),
  ]);
  const rawPhotos = [
    ...(attachmentsRes.data ?? []).map((a: { file_url: string }) => a.file_url),
    ...(photoMetaRes.data ?? []).map((p: { photo_url: string }) => p.photo_url),
  ].filter(Boolean);
  const signedPhotos = await resignJobStorageUrls(rawPhotos);

  // Coerce Postgres NUMERIC columns (serialised as strings by
  // supabase-js to preserve precision) into real JS numbers. The
  // mobile JobLocationMap passes `latitude` / `longitude` straight
  // into `react-native-maps` <MapView initialRegion> + <Marker
  // coordinate> props which crash the native Android module on a
  // string. Budgets need to be real numbers so any consumer doing
  // arithmetic (avg, sum, comparison) doesn't NaN-out via string
  // concatenation. Returning `null` for invalid values keeps
  // downstream `typeof === 'number'` guards honest.
  const toNum = (v: unknown): number | null => {
    if (v == null) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // No `property_type` column on `jobs`. The previous hardcoded
  // `propertyType: 'house'` was lying to every detail-screen viewer;
  // if a job has a `property_id`, the real property_type lives on
  // the linked properties row. Query best-effort + don't break the
  // detail page if the join fails.
  let propertyType: string | null = null;
  let propertyBedrooms: number | null = null;
  let propertyBathrooms: number | null = null;
  // 2026-05-23 audit: extended to also include the access columns so
  // mobile contractors get the same data the web contractor page sees.
  // Previously only `access_info` (the free-text field on `jobs`) was
  // surfaced; the structured property access fields (key_safe_code,
  // access_notes, stopcock/gas/consumer locations, access_mode) lived
  // only on the linked `properties` row and never reached mobile.
  // key_safe_code is gated by canRevealKeySafeCode() — same 1h-before-
  // start window the web contractor page uses (key-safe-reveal.ts).
  let propertyAccess: {
    access_mode: string | null;
    key_safe_code: string | null;
    access_notes: string | null;
    stopcock_location: string | null;
    gas_isolator_location: string | null;
    consumer_unit_location: string | null;
  } | null = null;
  if (row.property_id) {
    const { data: propertyRow } = await userDb
      .from('properties')
      .select(
        'property_type, bedrooms, bathrooms, access_mode, key_safe_code, access_notes, stopcock_location, gas_isolator_location, consumer_unit_location'
      )
      .eq('id', row.property_id as string)
      .maybeSingle();
    if (propertyRow) {
      const p = propertyRow as Record<string, unknown>;
      propertyType = (p.property_type as string | null) ?? null;
      propertyBedrooms = (p.bedrooms as number | null) ?? null;
      propertyBathrooms = (p.bathrooms as number | null) ?? null;

      // Reveal logic — homeowners always see everything; the assigned
      // contractor sees structured fields but the key_safe_code is
      // gated by the 1h-before-scheduled-start window.
      const isAssignedContractor =
        user.id === (row.contractor_id as string | null);
      const showFullAccess =
        isHomeowner || user.role === 'admin' || isAssignedContractor;

      if (showFullAccess) {
        const canSeeCode =
          isHomeowner ||
          user.role === 'admin' ||
          canRevealKeySafeCode({
            status: row.status as string | null,
            scheduled_start_date: row.scheduled_start_date as
              | string
              | null
              | undefined,
          });
        propertyAccess = {
          access_mode: (p.access_mode as string | null) ?? null,
          key_safe_code: canSeeCode
            ? ((p.key_safe_code as string | null) ?? null)
            : null,
          access_notes: (p.access_notes as string | null) ?? null,
          stopcock_location: (p.stopcock_location as string | null) ?? null,
          gas_isolator_location:
            (p.gas_isolator_location as string | null) ?? null,
          consumer_unit_location:
            (p.consumer_unit_location as string | null) ?? null,
        };
      }
    }
  }

  const budget = toNum(row.budget);
  const budgetMin = toNum(row.budget_min);
  const budgetMax = toNum(row.budget_max);

  // Format comprehensive job data for frontend
  const formattedJob = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    urgency: row.urgency ?? 'medium',
    budget: budget ?? 0,
    budget_min: budgetMin ?? budget ?? 0,
    budget_max: budgetMax ?? budget ?? 0,
    start_date: row.start_date,
    end_date: row.end_date,
    flexible_timeline: row.flexible_timeline || false,
    location: row.location || '',
    city: row.city || '',
    postcode: row.postcode || '',
    propertyType,
    propertyBedrooms,
    propertyBathrooms,
    accessInfo: row.access_info || '',
    // Structured property access fields. Null when the job has no
    // property_id, when the caller isn't homeowner/admin/assigned-
    // contractor, or when the lookup fails. key_safe_code is null
    // unless the caller is the homeowner / admin OR the assigned
    // contractor inside the 1h pre-visit reveal window.
    propertyAccess,
    scheduledStartDate: row.scheduled_start_date,
    images: signedPhotos,
    photos: signedPhotos,
    requirements: row.requirements ?? null,
    latitude: toNum(row.latitude),
    longitude: toNum(row.longitude),
    homeowner_id: row.homeowner_id,
    contractor_id: row.contractor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Record<string, unknown>;

  return NextResponse.json({ job: formattedJob });
}
