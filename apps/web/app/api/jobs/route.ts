import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JobDetail, JobSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.array(z.string()).optional(),
});

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(5000).optional(),
  status: z.string().optional(),
  category: z.string().max(128).optional(),
  budget: z.coerce.number().positive().optional(),
});

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

const mapRowToJobSummary = (row: JobRow): JobSummary => ({
  id: row.id,
  title: row.title,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRowToJobDetail = (row: JobRow): JobDetail => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
      status: url.searchParams.getAll('status') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { limit, cursor, status } = parsed.data;

    let query = serverSupabase
      .from('jobs')
      .select(jobSelectFields)
      .or(`homeowner_id.eq.${user.id},contractor_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (status?.length) {
      query = query.in('status', status);
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[API] jobs GET error', error);
      return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
    }

    const rows = (data ?? []) as JobRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const nextCursor = hasMore ? limitedRows.at(-1)?.created_at ?? undefined : undefined;

    const items: JobSummary[] = limitedRows.map(mapRowToJobSummary);

    return NextResponse.json({ jobs: items, nextCursor });
  } catch (err) {
    console.error('[API] jobs GET error', err);
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const payload = parsed.data;
    const insertPayload: {
      title: string;
      homeowner_id: string;
      status: string;
      description?: string;
      category?: string | null;
      budget?: number;
    } = {
      title: payload.title.trim(),
      homeowner_id: user.id,
      status: (payload.status ? payload.status.trim() : 'posted'),
    };

    if (typeof payload.description === 'string') {
      insertPayload.description = payload.description.trim();
    }
    if (payload.category !== undefined) {
      insertPayload.category = payload.category?.trim() ?? null;
    }
    if (payload.budget !== undefined) insertPayload.budget = payload.budget;

    const { data, error } = await serverSupabase
      .from('jobs')
      .insert(insertPayload)
      .select(jobSelectFields)
      .single();

    if (error) {
      console.error('[API] jobs POST error', error);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    const jobRow = data as JobRow;
    const job = mapRowToJobDetail(jobRow);

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    console.error('[API] jobs POST error', err);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
