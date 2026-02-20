import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { InternalServerError, BadRequestError } from '@/lib/errors/api-error';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/validator';

// GET: Fetch all training records for the contractor
export const GET = withApiHandler(
  { roles: ['contractor'], csrf: false },
  async (_request, { user }) => {
    const { data: training, error } = await serverSupabase
      .from('contractor_training')
      .select('id, course_name, provider, completion_date, hours, certificate_url, category, skills, notes, created_at')
      .eq('contractor_id', user.id)
      .order('completion_date', { ascending: false });

    if (error) {
      logger.error('Error fetching training', error, { service: 'training', userId: user.id });
      throw new InternalServerError('Failed to fetch training records');
    }

    const mapped = (training || []).map((t: Record<string, unknown>) => ({
      id: t.id,
      courseName: t.course_name,
      provider: t.provider,
      completionDate: t.completion_date,
      hours: t.hours,
      certificateUrl: t.certificate_url || null,
      category: t.category || 'general',
      skills: t.skills || [],
      notes: t.notes || null,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ training: mapped });
  }
);

const createTrainingSchema = z.object({
  courseName: z.string().min(1).max(500),
  provider: z.string().min(1).max(500),
  completionDate: z.string().min(1),
  hours: z.number().int().min(0),
  certificateUrl: z.string().optional(),
  category: z.string().optional(),
  skills: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// POST: Create a new training record
export const POST = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const validation = await validateRequest(request, createTrainingSchema);
    if (validation instanceof NextResponse) return validation;

    const d = validation.data;

    const { data: training, error } = await serverSupabase
      .from('contractor_training')
      .insert({
        contractor_id: user.id,
        course_name: d.courseName,
        provider: d.provider,
        completion_date: d.completionDate,
        hours: d.hours,
        certificate_url: d.certificateUrl || null,
        category: d.category || 'general',
        skills: d.skills || [],
        notes: d.notes || null,
      })
      .select('id, course_name, provider, completion_date, hours, certificate_url, category, skills, notes, created_at')
      .single();

    if (error) {
      logger.error('Error creating training', error, { service: 'training', userId: user.id });
      throw new InternalServerError('Failed to create training record');
    }

    return NextResponse.json({
      training: {
        id: training.id,
        courseName: training.course_name,
        provider: training.provider,
        completionDate: training.completion_date,
        hours: training.hours,
        certificateUrl: training.certificate_url,
        category: training.category,
        skills: training.skills,
        notes: training.notes,
        createdAt: training.created_at,
      },
    }, { status: 201 });
  }
);

// DELETE: Remove a training record
export const DELETE = withApiHandler(
  { roles: ['contractor'] },
  async (request: NextRequest, { user }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) throw new BadRequestError('Missing training id');

    const { data: existing } = await serverSupabase
      .from('contractor_training')
      .select('id')
      .eq('id', id)
      .eq('contractor_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
    }

    const { error } = await serverSupabase
      .from('contractor_training')
      .delete()
      .eq('id', id)
      .eq('contractor_id', user.id);

    if (error) {
      logger.error('Error deleting training', error, { service: 'training', userId: user.id });
      throw new InternalServerError('Failed to delete training record');
    }

    return NextResponse.json({ success: true });
  }
);
