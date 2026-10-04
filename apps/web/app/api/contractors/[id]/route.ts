import { NextResponse } from 'next/server';
import type { ContractorProfile } from '@mintenance/types/src/contracts';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withPublicRateLimit } from '@/lib/middleware/public-rate-limiter';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { getClientIp } from '@/lib/request-ip';

/**
 * GET /api/contractors/[id]
 * Public endpoint — fetch a contractor profile by ID
 * Uses custom IP-based rate limiting + withPublicRateLimit (double-layer)
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: false },
  async (request, { params }) => {
    // Custom IP-based rate limiting (contractor ID in URL makes each request unique)
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimiter.checkRateLimit({
      identifier: `contractor-profile:${ip}`,
      windowMs: 60000,
      maxRequests: 30,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(30),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': new Date(
              rateLimitResult.resetTime
            ).toISOString(),
          },
        }
      );
    }

    return withPublicRateLimit(
      request,
      async () => {
        const { id } = params;
        if (!id) {
          logger.warn('Contractor ID missing in request', {
            service: 'contractors',
          });
          throw new BadRequestError('Contractor id missing');
        }

        // R7 #9 postcode-proof badge — optional caller-supplied postcode to
        // surface "Hired by N households on <PREFIX> in the last 12 months".
        const rawPostcode = (
          request.nextUrl.searchParams.get('postcode') || ''
        ).trim();
        const postcodePrefix = rawPostcode
          ? (rawPostcode
              .replace(/\s+/g, '')
              .toUpperCase()
              .match(/^[A-Z]{1,2}\d[A-Z\d]?/)?.[0] ?? '')
          : '';

        // First check if user exists at all (without role filter)
        const { data: userCheck } = await serverSupabase
          .from('profile_directory')
          .select('id, role')
          .eq('id', id)
          .single();

        // Fetch contractor from database with all relevant fields
        const { data: contractor, error } = await serverSupabase
          .from('profile_directory')
          .select(
            `
          id,
          first_name,
          last_name,
          role,
          bio,
          rating,
          profile_image_url,
          admin_verified,
          company_name,
          city,
          country,
          latitude,
          longitude,
          is_available,
          portfolio_images,
          total_jobs_completed,
          hourly_rate,
          created_at
        `
          )
          .eq('id', id)
          .eq('role', 'contractor')
          .single();

        // Fetch skills separately from contractor_skills table
        const { data: skillsData } = await serverSupabase
          .from('contractor_skills')
          .select('skill_name')
          .eq('contractor_id', id);

        // 2026-05-23 audit: surface insurance for the "insured" trust
        // pill on contractor public profiles. The mobile
        // MyPublicProfileScreen reads `contractor.insurance.coverage_amount`
        // to decide whether to render the badge — without this
        // side-fetch it was always null, so contractors with current
        // policies couldn't preview their own insured-badge.
        // Picks the most-recently-updated active row that hasn't
        // expired; null when the contractor has no live cover.
        const todayIso = new Date().toISOString().slice(0, 10);
        const { data: activeInsurance } = await serverSupabase
          .from('contractor_insurance')
          .select('coverage_amount, expiry_date')
          .eq('contractor_id', id)
          .eq('status', 'active')
          .gte('expiry_date', todayIso)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const skills = skillsData?.map((s) => s.skill_name) || [];

        // Fetch review count from reviews table
        const { count: reviewCount } = await serverSupabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          // reviews has no is_visible column (responses have moderation
          // flags; reviews themselves are always visible) — the extra
          // filter made this count error to null on every profile
          // (filter-schema audit 2026-08-02).
          .eq('reviewee_id', id);

        if (error || !contractor) {
          logger.info('Contractor not found', {
            service: 'contractors',
            contractorId: id,
            error: error?.message,
            userExists: !!userCheck,
            userRole: userCheck?.role,
          });
          throw new NotFoundError('Contractor not found');
        }

        // R7 #9 — postcode proof: COUNT(DISTINCT homeowner_id) on this
        // contractor's completed jobs within 12mo + matching postcode
        // prefix. Deferred #8: the DISTINCT now runs in Postgres via
        // `contractor_postcode_proof_count` (SECURITY DEFINER) backed
        // by a partial index — no in-memory aggregation. Still gated
        // at >= 2 for privacy.
        let postcodeProofCount: number | null = null;
        if (postcodePrefix) {
          const { data: rpcCount, error: rpcErr } = await serverSupabase.rpc(
            'contractor_postcode_proof_count',
            {
              p_contractor_id: id,
              p_postcode_prefix: postcodePrefix,
            }
          );
          if (rpcErr) {
            logger.warn('postcode_proof rpc failed', {
              service: 'contractors',
              contractorId: id,
              err: rpcErr.message,
            });
          } else if (typeof rpcCount === 'number' && rpcCount >= 2) {
            postcodeProofCount = rpcCount;
          }
        }

        // Audit finding #5 (Apr-26 device test): the user asked whether
        // portfolio entries are based on completed-job before/after photos
        // OR manual additions. Today they were manual-only via
        // profiles.portfolio_images. Fold in after-photos from this
        // contractor's completed jobs so a contractor's track record
        // automatically populates their portfolio.
        //
        // Sequence: list completed jobs → fetch after-photos for those job
        // ids → re-sign Job-storage URLs (bucket is private since 2026-04-17)
        // → concat onto manual entries, dedupe.
        // Job completion photos are private evidence, not publication consent.
        // Only images explicitly curated into the contractor's portfolio belong
        // on this public endpoint. Never sign arbitrary completed-job photos.
        const manualImages = (contractor.portfolio_images || []).filter(
          (url: string) => Boolean(url)
        );
        const portfolioJobs =
          manualImages.length > 0
            ? [
                {
                  id: `manual-${id}`,
                  title: 'Past work',
                  category: 'portfolio',
                  images: manualImages,
                  description: '',
                  completionDate: '',
                  featured: false,
                },
              ]
            : [];

        // R7 #11 — dispute history: counts + mean resolution time against
        // this contractor. `disputes.against` references the contractor.
        const { data: disputeRows } = await serverSupabase
          .from('disputes')
          .select('id, status, created_at, resolved_at')
          .eq('against', id);
        const resolved = (disputeRows || []).filter(
          (d) => d.status === 'resolved' && d.resolved_at
        );
        const unresolvedCount = (disputeRows || []).length - resolved.length;
        const avgResolutionHours =
          resolved.length > 0
            ? Math.round(
                resolved.reduce((acc, d) => {
                  const ms =
                    new Date(d.resolved_at as string).getTime() -
                    new Date(d.created_at as string).getTime();
                  return acc + ms;
                }, 0) /
                  resolved.length /
                  (1000 * 60 * 60)
              )
            : null;

        // Transform to ContractorProfile format with extended fields
        const contractorProfile: ContractorProfile & {
          company_name?: string;
          city?: string;
          country?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          is_available?: boolean;
          portfolio_images?: string[];
          portfolio?: Array<{
            id: string;
            title: string;
            category: string;
            images: string[];
            description: string;
            completionDate: string;
            cost?: number;
            featured: boolean;
          }>;
          total_jobs_completed?: number;
          phone?: string;
          email?: string;
          skills?: string[];
          hourly_rate?: number;
          created_at?: string;
          verified?: boolean;
          postcode_prefix?: string;
          postcode_proof_count?: number | null;
          dispute_history?: {
            resolved_count: number;
            unresolved_count: number;
            avg_resolution_hours: number | null;
          };
          // 2026-05-23 audit: surfaced to mobile MyPublicProfileScreen
          // so the "Insured up to £X" trust pill renders for contractors
          // with a current, active policy. Null when no live cover.
          insurance?: {
            coverage_amount: number;
            expires_at: string | null;
          } | null;
        } = {
          id: contractor.id,
          name:
            `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() ||
            contractor.company_name ||
            'Contractor',
          avatarUrl: contractor.profile_image_url,
          rating: contractor.rating || 0,
          reviewCount: reviewCount || 0,
          bio: contractor.bio,
          company_name: contractor.company_name,
          city: contractor.city,
          country: contractor.country,
          latitude: contractor.latitude,
          longitude: contractor.longitude,
          is_available: contractor.is_available,
          portfolio_images: Array.from(new Set(manualImages)),
          portfolio: portfolioJobs,
          total_jobs_completed: contractor.total_jobs_completed || 0,
          skills: skills,
          // 2026-07-04: hourly_rate reads from canonical profiles
          // (contractor-profiles side table retired — it only ever
          // held Stripe/subscription columns).
          hourly_rate: contractor.hourly_rate ?? undefined,
          created_at: contractor.created_at,
          verified: contractor.admin_verified || false,
          postcode_prefix: postcodePrefix || undefined,
          postcode_proof_count: postcodeProofCount,
          dispute_history: {
            resolved_count: resolved.length,
            unresolved_count: unresolvedCount,
            avg_resolution_hours: avgResolutionHours,
          },
          insurance:
            activeInsurance && Number(activeInsurance.coverage_amount) > 0
              ? {
                  coverage_amount: Number(activeInsurance.coverage_amount),
                  expires_at: activeInsurance.expiry_date ?? null,
                }
              : null,
        };

        logger.info('Contractor retrieved successfully', {
          service: 'contractors',
          contractorId: id,
        });

        return NextResponse.json({ contractor: contractorProfile });
      },
      'resource'
    );
  }
);
