import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { requireCSRF } from '@/lib/csrf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Parse request body
    const { skills } = await request.json();

    if (!Array.isArray(skills)) {
      return NextResponse.json(
        { error: 'Invalid skills data' },
        { status: 400 }
      );
    }

    // Delete all existing skills for this contractor
    const { error: deleteError } = await supabase
      .from('contractor_skills')
      .delete()
      .eq('contractor_id', user.id);

    if (deleteError) {
      console.error('Delete skills error:', deleteError);
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
        console.error('Insert skills error:', insertError);
        return NextResponse.json(
          { error: 'Failed to add new skills' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error('Skills management error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

