import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { JobDetail } from '@mintenance/types/src/contracts';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { validateStatusTransition, type JobStatus } from '@/lib/job-state-machine';

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
        logger.warn('Job not found', {
          service: 'jobs',
          userId: user.id,
          jobId: id
        });
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      logger.error('Failed to load job', error, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      return NextResponse.json({ error: 'Failed to load job' }, { status: 500 });
    }

    const row = data as JobRow;
    if (row.homeowner_id !== user.id && row.contractor_id !== user.id) {
      logger.warn('Unauthorized job access attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        homeownerId: row.homeowner_id,
        contractorId: row.contractor_id
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logger.info('Job retrieved', {
      service: 'jobs',
      userId: user.id,
      jobId: id
    });

    return NextResponse.json({ job: mapRowToJobDetail(row) });
  } catch (err) {
    logger.error('Failed to load job', err, {
      service: 'jobs'
    });
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
        logger.warn('Job not found for update', {
          service: 'jobs',
          userId: user.id,
          jobId: id
        });
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      logger.error('Failed to fetch job for update', fetchError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    if (!existing || existing.homeowner_id !== user.id) {
      logger.warn('Unauthorized job update attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        homeownerId: existing?.homeowner_id
      });
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
      const newStatus = payload.status.trim() as JobStatus;
      const currentStatus = existing.status as JobStatus;

      // Validate status transition using state machine
      try {
        validateStatusTransition(currentStatus, newStatus);
        updatePayload.status = newStatus;
      } catch (error) {
        logger.warn('Invalid job status transition attempt', {
          service: 'jobs',
          userId: user.id,
          jobId: id,
          currentStatus,
          attemptedStatus: newStatus,
          error: (error as Error).message
        });
        return NextResponse.json({
          error: (error as Error).message
        }, { status: 400 });
      }
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
      logger.error('Failed to update job', error, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    logger.info('Job updated successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: id
    });

    return NextResponse.json({ job: mapRowToJobDetail(data as JobRow) });
  } catch (err) {
    logger.error('Failed to update job', err, {
      service: 'jobs'
    });
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;

    // Fetch the job to verify ownership and status
    const { data: existing, error: fetchError } = await serverSupabase
      .from('jobs')
      .select('id, homeowner_id, status, contractor_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        logger.warn('Job not found for deletion', {
          service: 'jobs',
          userId: user.id,
          jobId: id
        });
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      logger.error('Failed to fetch job for deletion', fetchError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    // Verify ownership - only homeowner can delete their own job
    if (!existing || existing.homeowner_id !== user.id) {
      logger.warn('Unauthorized job deletion attempt', {
        service: 'jobs',
        userId: user.id,
        jobId: id,
        homeownerId: existing?.homeowner_id
      });
      return NextResponse.json({ error: 'Forbidden: You can only delete your own jobs' }, { status: 403 });
    }

    // Only allow deletion of posted jobs (jobs without assigned contractors or accepted bids)
    // For posted jobs, allow deletion (pending bids are OK)
    // For other statuses, check restrictions
    if (existing.status !== 'posted') {
      // Check if there are accepted bids
      const { data: acceptedBids } = await serverSupabase
        .from('bids')
        .select('id')
        .eq('job_id', id)
        .eq('status', 'accepted')
        .limit(1);

      if (acceptedBids && acceptedBids.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete job with accepted bids. Please cancel the job instead.' 
        }, { status: 400 });
      }

      // If contractor is assigned, don't allow deletion
      if (existing.contractor_id) {
        return NextResponse.json({ 
          error: 'Cannot delete job with assigned contractor. Please cancel the job instead.' 
        }, { status: 400 });
      }
    } else {
      // For posted jobs, also check if contractor is assigned (shouldn't happen, but safety check)
      if (existing.contractor_id) {
        return NextResponse.json({ 
          error: 'Cannot delete job with assigned contractor. Please cancel the job instead.' 
        }, { status: 400 });
      }
    }

    // Delete the job (cascade will handle related records like bids, attachments, etc.)
    const { error: deleteError } = await serverSupabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete job', deleteError, {
        service: 'jobs',
        userId: user.id,
        jobId: id
      });
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    logger.info('Job deleted successfully', {
      service: 'jobs',
      userId: user.id,
      jobId: id
    });

    return NextResponse.json({ message: 'Job deleted successfully' }, { status: 200 });
  } catch (err) {
    logger.error('Failed to delete job', err, {
      service: 'jobs'
    });
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
  }
}

