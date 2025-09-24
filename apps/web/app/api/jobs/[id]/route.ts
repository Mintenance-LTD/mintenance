import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JobDetail } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

interface Params { params: { id: string } }

const jobSelectFields = 'id,title,description,status,homeowner_id,contractor_id,category,budget,created_at,updated_at';

const updateJobSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().max(5000).optional(),
  status: z.string().optional(),
  category: z.string().max(128).optional(),
  budget: z.coerce.number().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

function mapRowToJobDetail(row: any): JobDetail {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;

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

    const row: any = data;
    if (row.homeowner_id !== user.id && row.contractor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ job: mapRowToJobDetail(row) });
  } catch (err) {
    console.error('[API] job GET error', err);
    return NextResponse.json({ error: 'Failed to load job' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = params;

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
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (payload.title) updatePayload.title = payload.title.trim();
    if (payload.description !== undefined) updatePayload.description = payload.description?.trim() ?? null;
    if (payload.status) updatePayload.status = payload.status.trim();
    if (payload.category !== undefined) updatePayload.category = payload.category?.trim() ?? null;
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

    return NextResponse.json({ job: mapRowToJobDetail(data) });
  } catch (err) {
    console.error('[API] job PATCH error', err);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

