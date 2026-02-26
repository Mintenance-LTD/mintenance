import { NextResponse } from 'next/server';
import type { ContractorProfile } from '@mintenance/types/src/contracts';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withPublicRateLimit } from '@/lib/middleware/public-rate-limiter';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { withApiHandler } from '@/lib/api/with-api-handler';

/**
 * GET /api/contractors/[id]
 * Public endpoint — fetch a contractor profile by ID
 * Uses custom IP-based rate limiting + withPublicRateLimit (double-layer)
 */
export const GET = withApiHandler(
  { auth: false, rateLimit: false },
  async (request, { params }) => {
    // Custom IP-based rate limiting (contractor ID in URL makes each request unique)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous';
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
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        },
      );
    }

    return withPublicRateLimit(request, async () => {
      const { id } = params;
      if (!id) {
        logger.warn('Contractor ID missing in request', { service: 'contractors' });
        throw new BadRequestError('Contractor id missing');
      }

      // First check if user exists at all (without role filter)
      const { data: userCheck } = await serverSupabase
        .from('profiles')
        .select('id, role')
        .eq('id', id)
        .single();

      // Fetch contractor from database with all relevant fields
      const { data: contractor, error } = await serverSupabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          bio,
          rating,
          profile_image_url,
          admin_verified,
          company_name,
          city,
          country,
          address,
          latitude,
          longitude,
          is_available,
          total_jobs_completed,
          created_at
        `)
        .eq('id', id)
        .eq('role', 'contractor')
        .single();

      // Fetch skills separately from contractor_skills table
      const { data: skillsData } = await serverSupabase
        .from('contractor_skills')
        .select('skill_name')
        .eq('contractor_id', id);

      // Fetch hourly rate from contractor_profiles
      const { data: contractorProfileData } = await serverSupabase
        .from('contractor_profiles')
        .select('hourly_rate')
        .eq('id', id)
        .single();

      const skills = skillsData?.map(s => s.skill_name) || [];

      // Fetch review count from reviews table
      const { count: reviewCount } = await serverSupabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('contractor_id', id)
        .eq('is_visible', true);

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

      // Transform to ContractorProfile format with extended fields
      const contractorProfile: ContractorProfile & {
        company_name?: string;
        city?: string;
        country?: string;
        address?: string;
        latitude?: number;
        longitude?: number;
        is_available?: boolean;
        total_jobs_completed?: number;
        phone?: string;
        email?: string;
        skills?: string[];
        hourly_rate?: number;
        created_at?: string;
        verified?: boolean;
      } = {
        id: contractor.id,
        name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || contractor.email,
        avatarUrl: contractor.profile_image_url,
        rating: contractor.rating || 0,
        reviewCount: reviewCount || 0,
        bio: contractor.bio,
        company_name: contractor.company_name,
        city: contractor.city,
        country: contractor.country,
        address: contractor.address,
        latitude: contractor.latitude,
        longitude: contractor.longitude,
        is_available: contractor.is_available,
        total_jobs_completed: contractor.total_jobs_completed || 0,
        phone: contractor.phone,
        email: contractor.email,
        skills: skills,
        hourly_rate: contractorProfileData?.hourly_rate ?? undefined,
        created_at: contractor.created_at,
        verified: contractor.admin_verified || false,
      };

      logger.info('Contractor retrieved successfully', {
        service: 'contractors',
        contractorId: id,
      });

      return NextResponse.json({ contractor: contractorProfile });
    }, 'resource');
  },
);
