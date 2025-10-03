import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JobDetail } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

interface Params { params: Promise<{ id: string }> }

const jobSelectFields = 'id,title,description,status,homeowner_id,contractor_id,category,budget,created_at,updated_at';

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  homeowner_id: string;
  contractor_id?: string | null;
  category?: string | null;
  budget?: number | null;
  created_at: string;
  updated_at: string;
};

const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobDetail['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const updateJobSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().max(5000).optional(),
  status: z.string().optional(),
  category: z.string().max(128).optional(),
  budget: z.coerce.number().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export async function GET(_req: NextRequest, context: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;

    const { data, error } = await serverSupabase
      .from('jobs')
      .select(jobSelectFields)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      console.error('[API] job GET error', error);
      return NextResponse.json({ error: 'Failed to load job' }, { status: 500 });
    }

    const row = data as JobRow;
    if (row.homeowner_id !== user.id && row.contractor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ job: mapRowToJobDetail(row) });
  } catch (err) {
    console.error('[API] job GET error', err);
    return NextResponse.json({ error: 'Failed to load job' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;

    const body = await request.json();
    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await serverSupabase
      .from('jobs')
      .select(jobSelectFields)
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      console.error('[API] job PATCH fetch error', fetchError);
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    if (!existing || existing.homeowner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = parsed.data;
    const updatePayload: {
      title?: string;
      description?: string | null;
      status?: string;
      category?: string | null;
      budget?: number;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (typeof payload.title === 'string') {
      updatePayload.title = payload.title.trim();
    }
    if (payload.description !== undefined) {
      const trimmed = payload.description.trim();
      updatePayload.description = trimmed.length > 0 ? trimmed : null;
    }
    if (payload.status) {
      updatePayload.status = payload.status.trim();
    }
    if (payload.category !== undefined) {
      const trimmedCategory = payload.category.trim();
      updatePayload.category = trimmedCategory.length > 0 ? trimmedCategory : null;
    }
    if (payload.budget !== undefined) updatePayload.budget = payload.budget;

        const { data, error } = await serverSupabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', id)
      .select(jobSelectFields)
      .single();

    if (error) {
      console.error('[API] job PATCH update error', error);
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    return NextResponse.json({ job: mapRowToJobDetail(data as JobRow) });
  } catch (err) {
    console.error('[API] job PATCH error', err);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

