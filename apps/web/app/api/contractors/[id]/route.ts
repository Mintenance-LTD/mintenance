import { NextRequest, NextResponse } from 'next/server';
import type { ContractorProfile } from '@mintenance/types/src/contracts';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withPublicRateLimit } from '@/lib/middleware/public-rate-limiter';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: Params) {
  // Rate limiting check - use IP only, not URL (contractor ID in URL makes each request unique)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'anonymous';
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `contractor-profile:${ip}`,
    windowMs: 60000,
    maxRequests: 30
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
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

  return withPublicRateLimit(req, async (_request) => getContractor(context), 'resource');
}

async function getContractor(context: Params) {
  try {
    const { id } = await context.params;
    if (!id) {
      logger.warn('Contractor ID missing in request', { service: 'contractors' });
      throw new BadRequestError('Contractor id missing');
    }

    // First check if user exists at all (without role filter)
    const { data: userCheck, error: userCheckError } = await serverSupabase
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
        total_jobs_completed,
        created_at
      `)
      .eq('id', id)
      .eq('role', 'contractor')
      .single();

    // Fetch skills separately from contractor_skills table
    const { data: skillsData, error: skillsError } = await serverSupabase
      .from('contractor_skills')
      .select('skill_name')
      .eq('contractor_id', id);

    const skills = skillsData?.map(s => s.skill_name) || [];

    // Fetch review count from reviews table
    const { count: reviewCount, error: reviewCountError } = await serverSupabase
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
        userRole: userCheck?.role
      });
      throw new NotFoundError('Contractor not found');
    }

    // Transform to ContractorProfile format with extended fields
    const contractorProfile: ContractorProfile & {
      company_name?: string;
      city?: string;
      country?: string;
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
      total_jobs_completed: contractor.total_jobs_completed || 0,
      phone: contractor.phone,
      email: contractor.email,
      skills: skills,
      hourly_rate: undefined, // Stored in contractor_profiles table, fetch separately if needed
      created_at: contractor.created_at,
      verified: contractor.admin_verified || false,
    };

    logger.info('Contractor retrieved successfully', {
      service: 'contractors',
      contractorId: id
    });

    return NextResponse.json({ contractor: contractorProfile });
  } catch (err) {
    logger.error('Failed to load contractor', err, { service: 'contractors' });
    throw new InternalServerError('Internal server error');
  }
}