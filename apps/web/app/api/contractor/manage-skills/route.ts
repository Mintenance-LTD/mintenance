import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';
import { logger } from '@mintenance/shared';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';

const supabase = serverSupabase;

/**
 * POST /api/contractor/manage-skills
 * 
 * Manages contractor skills (add/remove).
 * Following Single Responsibility Principle - only handles skills management.
 * 
 * @filesize Target: <120 lines
 */
export async function POST(request: NextRequest) {
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

    
    // CSRF protection
    await requireCSRF(request);
// Get current user
    const user = await getCurrentUserFromCookies();
    
    if (!user || user.role !== 'contractor') {
      return NextResponse.json(
        { error: 'Unauthorized. Must be logged in as contractor.' },
        { status: 401 }
      );
    }

    // Validate request body
    const manageSkillsSchema = z.object({
      skills: z.array(
        z.union([
          z.string().min(1).max(200),
          z.object({
            skill_name: z.string().min(1).max(200),
            skill_icon: z.string().max(100),
          }),
        ])
      ).max(50),
    });

    const validation = await validateRequest(request, manageSkillsSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: validatedData } = validation;
    const { skills } = validatedData;

    // Delete all existing skills for this contractor
    const { error: deleteError } = await supabase
      .from('contractor_skills')
      .delete()
      .eq('contractor_id', user.id);

    if (deleteError) {
      logger.error('Delete skills error', deleteError, {
        service: 'contractor_skills',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to remove old skills' },
        { status: 500 }
      );
    }

    // Insert new skills with icons
    if (skills.length > 0) {
      const skillsData = skills.map((skill: string | { skill_name: string; skill_icon: string }) => {
        // Support both old format (string) and new format (object with icon)
        if (typeof skill === 'string') {
          return {
            contractor_id: user.id,
            skill_name: skill,
          };
        }
        return {
          contractor_id: user.id,
          skill_name: skill.skill_name,
          skill_icon: skill.skill_icon,
        };
      });

      const { data, error: insertError } = await supabase
        .from('contractor_skills')
        .insert(skillsData)
        .select();

      if (insertError) {
        logger.error('Insert skills error', insertError, {
          service: 'contractor_skills',
          userId: user.id,
        });
        return NextResponse.json(
          { error: 'Failed to add new skills' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    logger.error('Skills management error', error, {
      service: 'contractor_skills',
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

