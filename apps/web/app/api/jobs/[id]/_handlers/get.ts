import { NextRequest, NextResponse } from 'next/server';
import {
  serverSupabase,
  createRequestScopedClient,
} from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { resignJobStorageUrls } from '@/lib/api/job-storage';

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

  // Explicit column selection to avoid leaking sensitive data
  const { data, error } = await userDb
    .from('jobs')
    .select(
      'id, title, description, status, homeowner_id, contractor_id, category, budget, budget_min, budget_max, priority, location, city, postcode, latitude, longitude, start_date, end_date, flexible_timeline, access_info, requirements, created_at, updated_at'
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
  if (row.homeowner_id !== user.id && row.contractor_id !== user.id) {
    logger.warn('Unauthorized job access attempt', {
      service: 'jobs',
      userId: user.id,
      jobId: id,
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

  // Format comprehensive job data for frontend
  const formattedJob = {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    urgency: row.priority || 'medium',
    budget: row.budget || 0,
    budget_min: row.budget_min || row.budget || 0,
    budget_max: row.budget_max || row.budget || 0,
    start_date: row.start_date,
    end_date: row.end_date,
    flexible_timeline: row.flexible_timeline || false,
    location: row.location || '',
    city: row.city || '',
    postcode: row.postcode || '',
    propertyType: 'house',
    accessInfo: row.access_info || '',
    // `images` is the legacy field name (web). `photos` is the field
    // mobile's JobDetailsScreen / ImageCarousel actually reads. Keep
    // both populated with the same signed URLs so neither caller breaks.
    images: signedPhotos,
    photos: signedPhotos,
    requirements: row.requirements || [],
    latitude: row.latitude,
    longitude: row.longitude,
    homeowner_id: row.homeowner_id,
    contractor_id: row.contractor_id,
    homeowner: null,
    contractor: null,
    bidCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Record<string, unknown>;

  return NextResponse.json({ job: formattedJob });
}
