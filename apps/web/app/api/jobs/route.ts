import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JobDetail, JobSummary } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { sanitizeJobDescription, sanitizeText } from '@/lib/sanitizer';
import { logger } from '@mintenance/shared';

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  status: z.array(z.string()).optional(),
});

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').transform(val => sanitizeText(val, 200)),
  description: z.string().max(5000).optional().transform(val => val ? sanitizeJobDescription(val) : val),
  status: z.string().optional().transform(val => val ? sanitizeText(val, 50) : val),
  category: z.string().max(128).optional().transform(val => val ? sanitizeText(val, 128) : val),
  budget: z.coerce.number().positive().optional(),
});

// Enriched query with JOINs for complete data
const jobSelectFields = `
  id,
  title,
  description,
  status,
  homeowner_id,
  contractor_id,
  category,
  budget,
  location,
  created_at,
  updated_at,
  homeowner:users!homeowner_id(id,first_name,last_name,email),
  contractor:users!contractor_id(id,first_name,last_name,email),
  bids(count)
`.replace(/\s+/g, ' ').trim();

type UserData = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type JobRow = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  homeowner_id: string;
  contractor_id?: string | null;
  category?: string | null;
  budget?: number | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
  homeowner?: UserData;
  contractor?: UserData | null;
  bids?: Array<{ count: number }>;
};

const mapRowToJobSummary = (row: JobRow): JobSummary & {
  homeownerName?: string;
  contractorName?: string;
  category?: string;
  budget?: number;
  location?: string;
  bidCount?: number;
} => ({
  id: row.id,
  title: row.title,
  status: (row.status as JobSummary['status']) ?? 'posted',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  homeownerName: row.homeowner ? `${row.homeowner.first_name} ${row.homeowner.last_name}` : undefined,
  contractorName: row.contractor ? `${row.contractor.first_name} ${row.contractor.last_name}` : undefined,
  category: row.category ?? undefined,
  budget: row.budget ?? undefined,
  location: row.location ?? undefined,
  bidCount: row.bids?.[0]?.count ?? 0,
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
    if (error || !data) {
      logger.error('Failed to load jobs', error, {
        service: 'jobs',
        userId: user.id
      });
      return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 });
    }

    const rows = data as unknown as JobRow[];
    const hasMore = rows.length > limit;
    const limitedRows = rows.slice(0, limit);
    const nextCursor = hasMore ? limitedRows.at(-1)?.created_at ?? undefined : undefined;

    const items: JobSummary[] = limitedRows.map(mapRowToJobSummary);

    logger.info('Jobs list retrieved', {
      service: 'jobs',
      userId: user.id,
      jobCount: items.length,
      hasMore
    });

    return NextResponse.json({ jobs: items, nextCursor });
  } catch (err) {
    logger.error('Failed to load jobs', err, {
      service: 'jobs'
    });
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

    if (error || !data) {
      logger.error('Failed to create job', error, {
        service: 'jobs',
        userId: user.id
      });
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    const jobRow = data as unknown as JobRow;
    const job = mapRowToJobDetail(jobRow);

    logger.info('Job created successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: job.id,
      title: job.title
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    logger.error('Failed to create job', err, {
      service: 'jobs'
    });
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
