import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { resignJobStorageUrls } from '@/lib/api/job-storage';

interface ReviewPhoto {
  id: string;
  photo_url: string;
  storage_path: string | null;
  photo_type: string;
  angle_type: string | null;
  quality_score: number | null;
  created_at: string;
}

export const GET = withApiHandler(
  { roles: ['homeowner'], rateLimit: { maxRequests: 20 } },
  async (_request, { user, params }) => {
    const escrowId = params.id;
    const { data: escrow, error } = await serverSupabase
      .from('escrow_transactions')
      .select(
        'id, amount, status, admin_hold_status, homeowner_approval, homeowner_inspection_completed, auto_approval_date, jobs!inner(id, title, homeowner_id, payer_user_id, status, completed_at)'
      )
      .eq('id', escrowId)
      .single();
    if (error || !escrow) throw new NotFoundError('Escrow not found');
    type Job = {
      id: string;
      title: string;
      homeowner_id: string;
      payer_user_id: string | null;
      status: string;
      completed_at: string | null;
    };
    const joined = escrow.jobs as unknown as Job | Job[];
    const job = Array.isArray(joined) ? joined[0] : joined;
    if (!job || (job.homeowner_id !== user.id && job.payer_user_id !== user.id))
      throw new ForbiddenError('Unauthorized');
    const { data: rework, error: reworkError } = await serverSupabase
      .from('job_rework_requests')
      .select('created_at')
      .eq('job_id', job.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reworkError)
      throw new InternalServerError('Unable to load the current completion');

    // Explicit metadata reads avoid the obsolete FK alias and include photo_type.
    // Cursor paging does not silently truncate evidence at the Data API row limit.
    const photos: ReviewPhoto[] = [];
    let cursor: string | undefined;
    while (true) {
      let query = serverSupabase
        .from('job_photos_metadata')
        .select(
          'id, photo_url, storage_path, photo_type, angle_type, quality_score, created_at'
        )
        .eq('job_id', job.id)
        .in('photo_type', ['before', 'after'])
        .order('id')
        .limit(200);
      if (cursor) query = query.gt('id', cursor);
      if (rework)
        query = query.or(
          `photo_type.eq.before,created_at.gt.${rework.created_at}`
        );
      const { data, error: photoError } = await query;
      if (photoError)
        throw new InternalServerError('Unable to load completion photos');
      const page = (data ?? []) as ReviewPhoto[];
      if (!page.length) break;
      const next = page[page.length - 1].id;
      if (!next || (cursor && next <= cursor))
        throw new InternalServerError('Unable to load complete photo evidence');
      photos.push(...page);
      cursor = next;
    }
    const signed = await resignJobStorageUrls(
      photos.map((p) => p.storage_path ?? p.photo_url),
      user.id
    );
    const displayed = photos.map((p, index) => ({
      type: p.photo_type,
      url: signed[index],
      angleType: p.angle_type,
      qualityScore: p.quality_score,
    }));
    return NextResponse.json({
      success: true,
      data: {
        escrowId: escrow.id,
        amount: escrow.amount,
        jobTitle: job.title,
        completedAt: job.completed_at,
        homeownerApproval: escrow.homeowner_approval,
        inspectionCompleted: escrow.homeowner_inspection_completed,
        autoApprovalDate: escrow.auto_approval_date,
        canReview:
          (job.payer_user_id ?? job.homeowner_id) === user.id &&
          job.status === 'completed' &&
          ['held', 'awaiting_homeowner_approval'].includes(escrow.status) &&
          ['none', 'admin_approved'].includes(
            escrow.admin_hold_status ?? 'none'
          ),
        beforePhotos: displayed.filter((p) => p.type === 'before'),
        afterPhotos: displayed.filter((p) => p.type === 'after'),
      },
    });
  }
);
