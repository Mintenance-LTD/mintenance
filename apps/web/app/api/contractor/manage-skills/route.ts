import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { z } from 'zod';
import { InternalServerError } from '@/lib/errors/api-error';
import { withApiHandler } from '@/lib/api/with-api-handler';

const manageSkillsSchema = z.object({
  skills: z
    .array(
      z.union([
        z.string().min(1).max(200),
        z.object({ skill_name: z.string().min(1).max(200), skill_icon: z.string().max(100) }),
      ]),
    )
    .max(50),
});

/**
 * POST /api/contractor/manage-skills - update contractor's skills list.
 */
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request, { user }) => {
    const validation = await validateRequest(request, manageSkillsSchema);
    if (validation instanceof NextResponse) return validation;
    const { skills } = validation.data;

    // The active contractor_skills INSERT policy is service_role-only. Use
    // the server client for both operations, but keep every mutation scoped
    // to the authenticated contractor ID; never trust a client-supplied ID.
    const userDb = serverSupabase;

    // Delete all existing skills
    const { error: deleteError } = await userDb
      .from('contractor_skills')
      .delete()
      .eq('contractor_id', user.id);

    if (deleteError) {
      logger.error('Delete skills error', deleteError, {
        service: 'contractor_skills',
        userId: user.id,
      });
      throw new InternalServerError('Failed to remove old skills');
    }

    if (skills.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Insert new skills
    const skillsData = skills.map((skill: string | { skill_name: string; skill_icon: string }) => {
      if (typeof skill === 'string') {
        return { contractor_id: user.id, skill_name: skill };
      }
      return { contractor_id: user.id, skill_name: skill.skill_name, skill_icon: skill.skill_icon };
    });

    const { data, error: insertError } = await userDb
      .from('contractor_skills')
      .insert(skillsData)
      .select();

    if (insertError) {
      logger.error('Insert skills error', insertError, {
        service: 'contractor_skills',
        userId: user.id,
      });
      throw new InternalServerError('Failed to add new skills');
    }

    return NextResponse.json({ success: true, data });
  },
);
