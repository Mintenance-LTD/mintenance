import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { isValidUUID } from '@/lib/validation/uuid';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

/**
 * GET /api/admin/disputes/[id]
 *
 * Admin-only RICH detail view for a single dispute, used by the
 * master-detail Disputes page. The :id parameter is the
 * `escrow_transactions.id` — the same id the disputes list
 * (`GET /api/admin/disputes`) returns.
 *
 * The escrow row holds the workflow + verification state; the canonical
 * `disputes` table holds the user-supplied reason/description/resolution.
 * We additionally surface the real homeowner↔contractor message thread,
 * the job's before/after photo evidence, and computed contextual stats
 * (contractor win rate, prior disputes on both sides, ratings).
 *
 * All data is sourced from real tables — no fabricated content. Empty
 * arrays are returned when a job has no messages or photos.
 */

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
  rating: number | null;
  total_jobs_completed: number | null;
}

function displayName(p: ProfileRow | null, preferCompany = false): string {
  if (!p) return 'Unknown';
  if (preferCompany && p.company_name) return p.company_name;
  const full = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  return full || p.email || 'Unknown';
}

export const GET = withApiHandler(
  { roles: ['admin'], csrf: false },
  async (_request, { params }) => {
    const { id: disputeId } = params;

    if (!isValidUUID(disputeId)) {
      throw new BadRequestError('Invalid dispute ID format');
    }

    // ── Escrow transaction (workflow + verification state) ───────────
    const { data: escrow, error: escrowError } = await serverSupabase
      .from('escrow_transactions')
      .select(
        `
        id, job_id, payer_id, payee_id, amount, status,
        admin_hold_status, admin_hold_reason, admin_hold_at,
        description, metadata, created_at, updated_at,
        homeowner_approval, photo_verification_status,
        photo_verification_score, geolocation_verified,
        timestamp_verified, photo_quality_passed,
        before_after_comparison_score, trust_score,
        release_blocked_reason, cooling_off_ends_at, sla_deadline,
        dispute_priority, escalation_level
        `
      )
      .eq('id', disputeId)
      .maybeSingle();

    if (escrowError) {
      logger.error('Error fetching dispute escrow', {
        error: escrowError.message,
      });
      throw new NotFoundError('Dispute not found');
    }
    if (!escrow) {
      throw new NotFoundError('Dispute not found');
    }

    const jobId = escrow.job_id as string | null;

    // ── Job ──────────────────────────────────────────────────────────
    let job: {
      id: string;
      title: string;
      category: string | null;
      status: string;
      budget: number | null;
      location: string | null;
      created_at: string;
      completed_at: string | null;
    } | null = null;

    if (jobId) {
      const { data: jobRow } = await serverSupabase
        .from('jobs')
        .select(
          'id, title, category, status, budget, location, created_at, completed_at'
        )
        .eq('id', jobId)
        .maybeSingle();
      job = jobRow ?? null;
    }

    // ── Latest dispute record on the job ─────────────────────────────
    let disputeRecord: {
      id: string;
      reason: string | null;
      description: string | null;
      status: string | null;
      resolution: string | null;
      resolved_at: string | null;
      raised_by: string | null;
      against: string | null;
      created_at: string;
    } | null = null;

    if (jobId) {
      const { data: drows } = await serverSupabase
        .from('disputes')
        .select(
          'id, reason, description, status, resolution, resolved_at, raised_by, against, created_at'
        )
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (drows && drows.length > 0) {
        disputeRecord = drows[0];
      }
    }

    // ── Parties (homeowner = payer, contractor = payee) ──────────────
    const partyIds = [escrow.payer_id, escrow.payee_id].filter(
      (v): v is string => Boolean(v)
    );
    let profilesById: Record<string, ProfileRow> = {};
    if (partyIds.length > 0) {
      const { data: profileRows } = await serverSupabase
        .from('profiles')
        .select(
          'id, first_name, last_name, email, company_name, rating, total_jobs_completed'
        )
        .in('id', partyIds);
      profilesById = Object.fromEntries(
        (profileRows ?? []).map((p) => [p.id, p as ProfileRow])
      );
    }
    const homeowner = escrow.payer_id
      ? profilesById[escrow.payer_id] ?? null
      : null;
    const contractor = escrow.payee_id
      ? profilesById[escrow.payee_id] ?? null
      : null;

    // ── Conversation (real homeowner↔contractor thread on the job) ───
    let conversation: {
      id: string;
      senderId: string | null;
      senderName: string;
      content: string;
      createdAt: string;
    }[] = [];

    if (jobId) {
      const { data: messageRows } = await serverSupabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, message_type, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      // Resolve any sender ids not already in profilesById
      const senderIds = Array.from(
        new Set(
          (messageRows ?? [])
            .map((m) => m.sender_id)
            .filter((v): v is string => Boolean(v) && !profilesById[v])
        )
      );
      if (senderIds.length > 0) {
        const { data: extraProfiles } = await serverSupabase
          .from('profiles')
          .select(
            'id, first_name, last_name, email, company_name, rating, total_jobs_completed'
          )
          .in('id', senderIds);
        for (const p of extraProfiles ?? []) {
          profilesById[p.id] = p as ProfileRow;
        }
      }

      conversation = (messageRows ?? []).map((m) => ({
        id: m.id as string,
        senderId: (m.sender_id as string | null) ?? null,
        senderName: m.sender_id
          ? displayName(profilesById[m.sender_id] ?? null)
          : 'Unknown',
        content: (m.content as string) ?? '',
        createdAt: m.created_at as string,
      }));
    }

    // ── Evidence (job before/after photos) ───────────────────────────
    let evidence: {
      id: string;
      url: string;
      type: string | null;
      createdAt: string;
      qualityScore: number | null;
      verified: boolean | null;
    }[] = [];

    if (jobId) {
      const { data: photoRows } = await serverSupabase
        .from('job_photos_metadata')
        .select('id, photo_url, photo_type, created_at, quality_score, verified')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      evidence = (photoRows ?? []).map((p) => ({
        id: p.id as string,
        url: (p.photo_url as string) ?? '',
        type: (p.photo_type as string | null) ?? null,
        createdAt: p.created_at as string,
        qualityScore:
          p.quality_score != null ? Number(p.quality_score) : null,
        verified: (p.verified as boolean | null) ?? null,
      }));
    }

    // ── Context — computed real stats ────────────────────────────────
    // Contractor win rate: accepted bids / total bids for the payee.
    let contractorWinRate: number | null = null;
    if (escrow.payee_id) {
      const { data: bidRows } = await serverSupabase
        .from('bids')
        .select('status')
        .eq('contractor_id', escrow.payee_id);
      const totalBids = bidRows?.length ?? 0;
      if (totalBids > 0) {
        const acceptedBids = (bidRows ?? []).filter(
          (b) => b.status === 'accepted'
        ).length;
        contractorWinRate = Math.round((acceptedBids / totalBids) * 100);
      }
    }

    // Prior disputes — count of `disputes` rows excluding the current job.
    let contractorPriorDisputes = 0;
    if (escrow.payee_id) {
      const { count } = await serverSupabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .eq('against', escrow.payee_id)
        .neq('job_id', jobId ?? '');
      contractorPriorDisputes = count ?? 0;
    }

    let homeownerPriorDisputes = 0;
    if (escrow.payer_id) {
      const { count } = await serverSupabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .eq('raised_by', escrow.payer_id)
        .neq('job_id', jobId ?? '');
      homeownerPriorDisputes = count ?? 0;
    }

    return NextResponse.json({
      id: escrow.id,
      jobId,
      escrow: {
        amount: Number(escrow.amount) || 0,
        status: escrow.status,
        adminHoldStatus: escrow.admin_hold_status,
        adminHoldReason: escrow.admin_hold_reason,
        adminHoldAt: escrow.admin_hold_at,
        description: escrow.description,
        createdAt: escrow.created_at,
        updatedAt: escrow.updated_at,
        homeownerApproval: escrow.homeowner_approval,
        photoVerificationStatus: escrow.photo_verification_status,
        photoVerificationScore:
          escrow.photo_verification_score != null
            ? Number(escrow.photo_verification_score)
            : null,
        geolocationVerified: escrow.geolocation_verified,
        timestampVerified: escrow.timestamp_verified,
        photoQualityPassed: escrow.photo_quality_passed,
        beforeAfterComparisonScore:
          escrow.before_after_comparison_score != null
            ? Number(escrow.before_after_comparison_score)
            : null,
        trustScore:
          escrow.trust_score != null ? Number(escrow.trust_score) : null,
        releaseBlockedReason: escrow.release_blocked_reason,
        coolingOffEndsAt: escrow.cooling_off_ends_at,
        slaDeadline: escrow.sla_deadline,
        disputePriority: escrow.dispute_priority,
        escalationLevel: escrow.escalation_level,
      },
      dispute: disputeRecord
        ? {
            recordId: disputeRecord.id,
            reason: disputeRecord.reason,
            description: disputeRecord.description,
            status: disputeRecord.status,
            resolution: disputeRecord.resolution,
            resolvedAt: disputeRecord.resolved_at,
            raisedBy: disputeRecord.raised_by,
            against: disputeRecord.against,
            createdAt: disputeRecord.created_at,
          }
        : null,
      job: job
        ? {
            id: job.id,
            title: job.title,
            category: job.category,
            status: job.status,
            budget: job.budget != null ? Number(job.budget) : null,
            location: job.location,
            createdAt: job.created_at,
            completedAt: job.completed_at,
          }
        : null,
      parties: {
        homeowner: homeowner
          ? {
              id: homeowner.id,
              name: displayName(homeowner),
              email: homeowner.email,
            }
          : { id: escrow.payer_id, name: 'Unknown', email: null },
        contractor: contractor
          ? {
              id: contractor.id,
              name: displayName(contractor, true),
              email: contractor.email,
            }
          : { id: escrow.payee_id, name: 'Unknown', email: null },
      },
      conversation,
      evidence,
      context: {
        contractorWinRate,
        contractorPriorDisputes,
        homeownerPriorDisputes,
        contractorRating:
          contractor?.rating != null ? Number(contractor.rating) : null,
        contractorJobsCompleted:
          contractor?.total_jobs_completed != null
            ? Number(contractor.total_jobs_completed)
            : null,
        jobPostedAt: job?.created_at ?? null,
        jobCompletedAt: job?.completed_at ?? null,
      },
    });
  }
);
