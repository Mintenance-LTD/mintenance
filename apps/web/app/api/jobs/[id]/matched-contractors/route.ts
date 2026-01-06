import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { AIMatchingService } from '@/lib/services/AIMatchingService';
import type { MatchingCriteria } from '@/lib/services/matching/types';
import { logger } from '@mintenance/shared';
import { handleAPIError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';

/**
 * Get intelligently matched contractors for a job
 * GET /api/jobs/[id]/matched-contractors
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const jobId = resolvedParams.id;
  
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
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


    const user = await getCurrentUserFromCookies();
    if (!user) {
      throw new UnauthorizedError('Authentication required to view matched contractors');
    }

    // Fetch job details
    const { data: job, error: jobError } = await serverSupabase
      .from('jobs')
      .select('id, title, description, category, location, budget, homeowner_id, status, priority')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new NotFoundError('Job not found');
    }

    // Verify user owns the job
    if (job.homeowner_id !== user.id) {
      throw new ForbiddenError('Not authorized to view matches for this job');
    }

    // Geocode job location to get coordinates
    let jobCoords = { latitude: 0, longitude: 0 };
    if (job.location) {
      try {
        const geocodeResponse = await fetch(
          `${request.nextUrl.origin}/api/geocode?address=${encodeURIComponent(job.location)}`
        );
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.latitude && geocodeData.longitude) {
            jobCoords = {
              latitude: geocodeData.latitude,
              longitude: geocodeData.longitude,
            };
          }
        }
      } catch (err) {
        logger.error('Error geocoding job location', err, {
          service: 'jobs',
          jobId,
          location: job.location,
        });
      }
    }

    // Extract required skills from job category and description
    const requiredSkills = job.category ? [job.category.toLowerCase()] : [];
    
    // Extract skills from description (simple keyword matching)
    const descriptionLower = (job.description || '').toLowerCase();
    const skillKeywords: Record<string, string[]> = {
      plumbing: ['plumber', 'plumbing', 'pipe', 'leak', 'water', 'drain', 'toilet', 'sink'],
      electrical: ['electrician', 'electrical', 'wiring', 'circuit', 'outlet', 'light', 'power'],
      hvac: ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'ac'],
      roofing: ['roof', 'roofing', 'gutter', 'shingle', 'tile'],
      painting: ['paint', 'painting', 'wall', 'ceiling'],
      carpentry: ['carpenter', 'carpentry', 'wood', 'cabinet', 'door', 'frame'],
      general: ['handyman', 'repair', 'maintenance', 'fix'],
    };

    // Add skills based on description keywords
    Object.entries(skillKeywords).forEach(([skill, keywords]) => {
      if (keywords.some(keyword => descriptionLower.includes(keyword))) {
        if (!requiredSkills.includes(skill)) {
          requiredSkills.push(skill);
        }
      }
    });

    // If no skills found, use general
    if (requiredSkills.length === 0) {
      requiredSkills.push('general');
    }

    // Determine urgency from priority
    const urgencyMap: Record<string, 'emergency' | 'urgent' | 'normal' | 'flexible'> = {
      high: 'urgent',
      medium: 'normal',
      low: 'flexible',
    };
    const urgency = urgencyMap[job.priority || 'normal'] || 'normal';

    // Determine complexity from budget (simple heuristic)
    const complexity = job.budget > 5000 ? 'complex' : job.budget > 2000 ? 'medium' : 'simple';

    // Build matching criteria
    const criteria: MatchingCriteria = {
      jobId: job.id,
      location: {
        latitude: jobCoords.latitude,
        longitude: jobCoords.longitude,
        maxDistance: 50, // 50 miles radius
      },
      budget: {
        min: Math.max(0, job.budget * 0.7), // 70% of budget
        max: job.budget * 1.5, // 150% of budget
      },
      urgency,
      requiredSkills,
      projectComplexity: complexity,
      timeframe: urgency === 'urgent' || urgency === 'emergency' ? 'immediate' : 'this_week',
    };

    // Get intelligently matched contractors
    const matches = await AIMatchingService.findMatches(criteria);

    // Limit to top 10 matches
    const topMatches = matches.slice(0, 10);

    return NextResponse.json({
      matches: topMatches.map(match => ({
        contractor: {
          id: match.contractor.id,
          firstName: match.contractor.first_name,
          lastName: match.contractor.last_name,
          email: match.contractor.email,
          phone: match.contractor.phone,
          profileImageUrl: match.contractor.profile_image_url,
          location: match.contractor.location || match.contractor.businessAddress || '',
          companyName: match.contractor.companyName,
          yearsExperience: match.contractor.yearsExperience,
          hourlyRate: match.contractor.hourlyRate,
          skills: match.contractor.skills?.map(s => s.skillName) || [],
          rating: match.contractor.reviews?.length > 0
            ? match.contractor.reviews.reduce((sum: number, r: { rating: number }) => sum + (typeof r.rating === 'number' ? r.rating : 0), 0) / match.contractor.reviews.length
            : null,
          reviewCount: match.contractor.reviews?.length || 0,
        },
        matchScore: match.matchScore,
        matchBreakdown: match.matchBreakdown,
        estimatedRate: match.estimatedRate,
        availability: match.availability,
        distance: match.distance,
        confidenceLevel: match.confidenceLevel,
        reasons: match.reasons,
        concerns: match.concerns,
      })),
      criteria: {
        requiredSkills,
        urgency,
        complexity,
        budgetRange: criteria.budget,
      },
    });

  } catch (error) {
    return handleAPIError(error);
  }
}

